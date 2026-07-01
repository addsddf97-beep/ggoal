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

  try {
    return await createImageWithJsonApi(baseUrl, prompt, config);
  } catch (error) {
    if (!(error instanceof LocalImageRequestError) || ![400, 404, 415, 422].includes(error.status)) {
      throw error;
    }

    return createImageWithFileApi(baseUrl, prompt, config, error);
  }
}

async function createImageWithJsonApi(baseUrl: string, prompt: string, config: ReturnType<typeof getServerConfig>) {
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

  return readImageResponse(response, baseUrl, config.localImageTimeoutMs);
}

async function createImageWithFileApi(
  baseUrl: string,
  prompt: string,
  config: ReturnType<typeof getServerConfig>,
  previousError: unknown
) {
  const response = await fetchWithTimeout(
    new URL("/generate_file", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.localImageModel,
        prompt,
        size: config.localImageSize,
        width: parseImageSize(config.localImageSize).width,
        height: parseImageSize(config.localImageSize).height
      })
    },
    config.localImageTimeoutMs
  );

  try {
    return await readImageResponse(response, baseUrl, config.localImageTimeoutMs);
  } catch (error) {
    throw new Error(
      `로컬 이미지 생성 API 호출에 실패했습니다. JSON API 오류: ${describeError(previousError)} / file API 오류: ${describeError(error)}`
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

function parseImageSize(size: string) {
  const match = size.match(/^(\d+)x(\d+)$/);

  if (!match) {
    return { width: 256, height: 256 };
  }

  return {
    width: Number(match[1]),
    height: Number(match[2])
  };
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
