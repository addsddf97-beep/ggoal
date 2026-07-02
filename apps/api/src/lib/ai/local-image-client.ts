import { basename } from "node:path";
import { getServerConfig } from "@/lib/env";

type JsonRecord = Record<string, unknown>;

class LocalImageRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function createLocalImage(prompt: string) {
  const config = getServerConfig();
  const baseUrl = normalizeBaseUrl(config.localImageBaseUrl);

  if (config.localImageApi === "comfyui") {
    return createImageWithComfyUi(baseUrl, prompt, config);
  }

  try {
    return await createImageWithFileApi(baseUrl, prompt, config);
  } catch (error) {
    if (!(error instanceof LocalImageRequestError) || ![400, 404, 415, 422].includes(error.status)) {
      throw error;
    }

    return createImageWithJsonApi(baseUrl, prompt, config, error);
  }
}

async function createImageWithComfyUi(baseUrl: string, prompt: string, config: ReturnType<typeof getServerConfig>) {
  const deadline = Date.now() + config.localImageTimeoutMs;
  const { width, height } = parseImageSize(config.localImageSize);
  const checkpoint = config.localImageModel || (await fetchFirstComfyCheckpoint(baseUrl, deadline));
  const workflow = buildComfyTxt2ImgWorkflow({
    checkpoint,
    config,
    height,
    prompt,
    width
  });
  const promptId = await queueComfyPrompt(baseUrl, workflow, deadline);
  const imageReference = await pollComfyImageReference(baseUrl, promptId, deadline);

  return fetchComfyImage(baseUrl, imageReference, remainingTimeout(deadline));
}

async function fetchFirstComfyCheckpoint(baseUrl: string, deadline: number) {
  const response = await fetchWithTimeout(new URL("/models/checkpoints", baseUrl), {}, remainingTimeout(deadline));

  if (!response.ok) {
    throw new Error(`ComfyUI checkpoint 목록을 불러오지 못했습니다 (${response.status}). LOCAL_IMAGE_MODEL을 설정해 주세요.`);
  }

  const checkpoints = (await response.json()) as unknown;

  if (Array.isArray(checkpoints) && typeof checkpoints[0] === "string" && checkpoints[0].trim()) {
    return checkpoints[0];
  }

  throw new Error(
    "ComfyUI checkpoint 모델을 찾지 못했습니다. ComfyUI의 models/checkpoints 폴더에 모델을 추가하거나 LOCAL_IMAGE_MODEL을 설정해 주세요."
  );
}

async function queueComfyPrompt(baseUrl: string, workflow: JsonRecord, deadline: number) {
  const response = await fetchWithTimeout(
    new URL("/prompt", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: `food-shorts-${crypto.randomUUID()}`,
        prompt: workflow
      })
    },
    remainingTimeout(deadline)
  );
  const text = await response.text();

  if (!response.ok) {
    throw new LocalImageRequestError(response.status, `ComfyUI /prompt 요청 실패: ${text.slice(0, 1200)}`);
  }

  const payload = parseJsonPayload(text) as JsonRecord;
  const nodeErrors = payload.node_errors;

  if (nodeErrors && typeof nodeErrors === "object" && Object.keys(nodeErrors).length > 0) {
    throw new Error(`ComfyUI workflow node 오류: ${JSON.stringify(nodeErrors).slice(0, 1200)}`);
  }

  const promptId = payload.prompt_id;

  if (typeof promptId !== "string" || !promptId.trim()) {
    throw new Error(`ComfyUI /prompt 응답에서 prompt_id를 찾지 못했습니다: ${text.slice(0, 1200)}`);
  }

  return promptId;
}

async function pollComfyImageReference(baseUrl: string, promptId: string, deadline: number) {
  let lastPayload: unknown;

  while (Date.now() < deadline) {
    const response = await fetchWithTimeout(
      new URL(`/history/${encodeURIComponent(promptId)}`, baseUrl),
      {},
      Math.min(30000, remainingTimeout(deadline))
    );
    const text = await response.text();

    if (!response.ok) {
      throw new LocalImageRequestError(response.status, `ComfyUI /history 요청 실패: ${text.slice(0, 1200)}`);
    }

    const payload = parseJsonPayload(text);
    lastPayload = payload;
    const imageReference = findComfyImageReference(payload, promptId);

    if (imageReference) {
      return imageReference;
    }

    const error = findComfyExecutionError(payload, promptId);

    if (error) {
      throw new Error(`ComfyUI 이미지 생성 실패: ${error}`);
    }

    await sleep(1500);
  }

  throw new Error(`ComfyUI 이미지 생성 시간이 초과되었습니다: ${JSON.stringify(lastPayload).slice(0, 1200)}`);
}

async function fetchComfyImage(baseUrl: string, reference: ComfyImageReference, timeoutMs: number) {
  const url = new URL("/view", baseUrl);
  url.searchParams.set("filename", reference.filename);
  url.searchParams.set("type", reference.type || "output");

  if (reference.subfolder) {
    url.searchParams.set("subfolder", reference.subfolder);
  }

  const response = await fetchWithTimeout(url, {}, timeoutMs);
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    throw new LocalImageRequestError(response.status, `ComfyUI /view 요청 실패: ${buffer.toString("utf8").slice(0, 1200)}`);
  }

  if (!isLikelyImageBuffer(buffer)) {
    throw new Error(`ComfyUI /view 응답이 이미지가 아닙니다: ${buffer.toString("utf8").slice(0, 1200)}`);
  }

  return buffer;
}

type ComfyImageReference = {
  filename: string;
  subfolder?: string;
  type?: string;
};

function findComfyImageReference(payload: unknown, promptId: string): ComfyImageReference | null {
  const root = selectPromptHistory(payload, promptId);
  return findNestedComfyImage(root);
}

function selectPromptHistory(payload: unknown, promptId: string) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const record = payload as JsonRecord;
  return record[promptId] ?? payload;
}

function findNestedComfyImage(value: unknown): ComfyImageReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findNestedComfyImage(item);

      if (nested) {
        return nested;
      }
    }

    return null;
  }

  const record = value as JsonRecord;
  const images = record.images;

  if (Array.isArray(images)) {
    for (const image of images) {
      if (!image || typeof image !== "object") {
        continue;
      }

      const imageRecord = image as JsonRecord;

      if (typeof imageRecord.filename === "string" && imageRecord.filename.trim()) {
        return {
          filename: imageRecord.filename,
          subfolder: typeof imageRecord.subfolder === "string" ? imageRecord.subfolder : undefined,
          type: typeof imageRecord.type === "string" ? imageRecord.type : undefined
        };
      }
    }
  }

  for (const item of Object.values(record)) {
    const nested = findNestedComfyImage(item);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function findComfyExecutionError(payload: unknown, promptId: string) {
  const root = selectPromptHistory(payload, promptId);

  if (!root || typeof root !== "object") {
    return null;
  }

  const status = (root as JsonRecord).status;

  if (!status || typeof status !== "object") {
    return null;
  }

  const statusRecord = status as JsonRecord;

  if (statusRecord.status_str === "error" || statusRecord.completed === false) {
    return JSON.stringify(statusRecord).slice(0, 1200);
  }

  return null;
}

function buildComfyTxt2ImgWorkflow({
  checkpoint,
  config,
  height,
  prompt,
  width
}: {
  checkpoint: string;
  config: ReturnType<typeof getServerConfig>;
  height: number;
  prompt: string;
  width: number;
}) {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: config.localImageCfgScale,
        denoise: 1,
        latent_image: ["5", 0],
        model: ["4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: config.localImageSampler,
        scheduler: config.localImageScheduler,
        seed: config.localImageSeed,
        steps: config.localImageSteps
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint
      }
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        batch_size: 1,
        height,
        width
      }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: ["4", 1],
        text: prompt
      }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: ["4", 1],
        text: config.localImageNegativePrompt
      }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2]
      }
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "food-shorts",
        images: ["8", 0]
      }
    }
  };
}

async function createImageWithFileApi(baseUrl: string, prompt: string, config: ReturnType<typeof getServerConfig>) {
  const response = await fetchWithTimeout(
    new URL("/generate_file", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        seed: config.localImageSeed,
        cfg_scale: config.localImageCfgScale,
        temperature: config.localImageTemperature,
        size: config.localImageSize
      })
    },
    config.localImageTimeoutMs
  );

  return readImageResponse(response, baseUrl, config.localImageTimeoutMs);
}

async function createImageWithJsonApi(
  baseUrl: string,
  prompt: string,
  config: ReturnType<typeof getServerConfig>,
  previousError: unknown
) {
  const response = await fetchWithTimeout(
    new URL("/v1/images/generations", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.localImageModel,
        prompt,
        n: 1,
        size: config.localImageSize,
        response_format: "b64_json"
      })
    },
    config.localImageTimeoutMs
  );

  try {
    return await readImageResponse(response, baseUrl, config.localImageTimeoutMs);
  } catch (error) {
    throw new Error(
      `로컬 이미지 생성 API 호출에 실패했습니다. generate_file 오류: ${describeError(previousError)} / JSON API 오류: ${describeError(error)}`
    );
  }
}

async function readImageResponse(response: Response, baseUrl: string, timeoutMs: number) {
  const contentType = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    throw new LocalImageRequestError(response.status, buffer.toString("utf8").slice(0, 1200));
  }

  if (contentType.includes("image") || isLikelyImageBuffer(buffer)) {
    return buffer;
  }

  const text = buffer.toString("utf8");
  const payload = parseJsonPayload(text);
  const image = await resolveImageFromPayload(payload, baseUrl, timeoutMs);

  if (!image) {
    throw new Error(`로컬 이미지 응답에서 PNG 이미지를 찾지 못했습니다: ${text.slice(0, 1200)}`);
  }

  return image;
}

async function resolveImageFromPayload(payload: unknown, baseUrl: string, timeoutMs: number): Promise<Buffer | null> {
  const directImage = findStringValue(payload, [
    "b64_json",
    "imageDataUrl",
    "image_data_url",
    "imageBase64",
    "image_base64",
    "pngBase64",
    "png_base64",
    "base64",
    "data"
  ]);

  if (directImage) {
    if (directImage.startsWith("data:")) {
      return decodeDataUrl(directImage);
    }

    if (looksLikeImageReference(directImage)) {
      return fetchImageReference(directImage, baseUrl, timeoutMs);
    }

    return Buffer.from(stripBase64Prefix(directImage), "base64");
  }

  const reference = findStringValue(payload, [
    "url",
    "imageUrl",
    "image_url",
    "path",
    "fileUrl",
    "file_url",
    "filename",
    "file",
    "name",
    "output"
  ]);

  if (reference) {
    return fetchImageReference(reference, baseUrl, timeoutMs);
  }

  return null;
}

async function fetchImageReference(reference: string, baseUrl: string, timeoutMs: number) {
  const urls = buildImageUrls(reference, baseUrl);
  let lastError: unknown;

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {}, timeoutMs);
      const buffer = Buffer.from(await response.arrayBuffer());

      if (response.ok && buffer.length > 0) {
        return buffer;
      }

      lastError = new Error(`${url.toString()} 응답 실패 (${response.status})`);
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`로컬 이미지 파일을 가져오지 못했습니다: ${describeError(lastError)}`);
}

function buildImageUrls(reference: string, baseUrl: string) {
  const trimmed = reference.trim();
  const urls: URL[] = [];

  try {
    urls.push(new URL(trimmed, baseUrl));
  } catch {
    // Fall through to filename-based lookup.
  }

  const filename = basename(trimmed.replace(/\\/g, "/"));

  if (filename) {
    urls.push(new URL(`/${filename}`, baseUrl));
  }

  return urls;
}

function parseImageSize(size: string) {
  const match = size.match(/^(\d+)x(\d+)$/i);

  if (!match) {
    return { width: 512, height: 512 };
  }

  const width = clampImageDimension(Number(match[1]));
  const height = clampImageDimension(Number(match[2]));

  return { width, height };
}

function clampImageDimension(value: number) {
  if (!Number.isFinite(value)) {
    return 512;
  }

  const rounded = Math.round(value / 8) * 8;
  return Math.min(2048, Math.max(64, rounded));
}

function remainingTimeout(deadline: number) {
  return Math.max(1000, deadline - Date.now());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`로컬 이미지 생성 응답 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
    }

    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      throw new Error(`로컬 이미지 서버에 연결하지 못했습니다. ${url.origin}/health 상태를 확인해 주세요.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonPayload(text: string) {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`로컬 이미지 응답이 JSON 또는 이미지가 아닙니다: ${text.slice(0, 1200)}`);
  }
}

function findStringValue(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findStringValue(entry, keys);

      if (nested) {
        return nested;
      }
    }

    return null;
  }

  const record = value as JsonRecord;

  for (const key of keys) {
    const entry = record[key];

    if (typeof entry === "string" && entry.trim()) {
      return entry;
    }
  }

  for (const entry of Object.values(record)) {
    const nested = findStringValue(entry, keys);

    if (nested) {
      return nested;
    }
  }

  return null;
}

function isLikelyImageBuffer(buffer: Buffer) {
  return (
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    buffer.subarray(0, 4).toString("ascii") === "RIFF"
  );
}

function looksLikeImageReference(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.includes("\\") ||
    /\.(png|jpg|jpeg|webp)(?:$|\?)/i.test(trimmed)
  );
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);

  if (!match) {
    throw new Error("로컬 이미지 data URL 형식이 올바르지 않습니다.");
  }

  return Buffer.from(match[1], "base64");
}

function stripBase64Prefix(value: string) {
  return value.replace(/^base64,/i, "").replace(/\s/g, "");
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function describeError(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 700);
  }

  return String(error).slice(0, 700);
}
