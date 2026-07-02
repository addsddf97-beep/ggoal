import { basename } from "node:path";
import { getServerConfig } from "@/lib/env";

type LocalTtsOptions = {
  text: string;
  speed?: number;
};

type JsonRecord = Record<string, unknown>;

class LocalTtsRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function createLocalTtsAudio({ text, speed }: LocalTtsOptions) {
  const config = getServerConfig();
  const baseUrl = normalizeBaseUrl(config.localTtsBaseUrl);
  const normalizedSpeed = typeof speed === "number" && Number.isFinite(speed) ? Math.min(2, Math.max(0.5, speed)) : undefined;
  const ttsEndpoints = ["/tts", "/generate_file"];
  const requestBodies = [
    {
      message: text,
      voice: config.localTtsVoice,
      language: config.localTtsLanguage,
      lang: config.localTtsLanguage,
      rate: config.localTtsRate,
      speed: normalizedSpeed,
      volume: config.localTtsVolume,
      format: "wav"
    },
    {
      message: text,
      speed: normalizedSpeed
    },
    {
      text,
      voice: config.localTtsVoice,
      language: config.localTtsLanguage,
      lang: config.localTtsLanguage,
      rate: config.localTtsRate,
      speed: normalizedSpeed,
      format: "wav"
    },
    {
      text,
      voice: config.localTtsVoice,
      rate: config.localTtsRate,
      speed: normalizedSpeed,
      volume: config.localTtsVolume,
    },
    {
      input: text,
      voice: config.localTtsVoice,
      language: config.localTtsLanguage,
      speed: normalizedSpeed
    },
    { text, speed: normalizedSpeed },
    { text }
  ];
  let lastError: unknown;
  let attemptedEndpoint = "";

  for (const endpoint of ttsEndpoints) {
    for (const body of requestBodies) {
      try {
        attemptedEndpoint = endpoint;
        return await postLocalTts(baseUrl, endpoint, body, config.localTtsTimeoutMs);
      } catch (error) {
        lastError = error;

        if (!(error instanceof LocalTtsRequestError) || ![400, 404, 405, 415, 422].includes(error.status)) {
          throw error;
        }
      }
    }
  }

  throw new Error(
    `로컬 TTS 요청 형식이 맞지 않습니다 (${attemptedEndpoint}): ${describeError(lastError)}`
  );
}

async function postLocalTts(baseUrl: string, endpoint: string, body: JsonRecord, timeoutMs: number) {
  const response = await fetchWithTimeout(
    new URL(endpoint, baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    },
    timeoutMs
  );
  const contentType = response.headers.get("content-type") ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());

  if (!response.ok) {
    throw new LocalTtsRequestError(response.status, buffer.toString("utf8").slice(0, 1200));
  }

  if (contentType.includes("audio") || isLikelyAudioBuffer(buffer)) {
    return buffer;
  }

  const text = buffer.toString("utf8");
  const trimmed = text.trim();

  if (looksLikeAudioReference(trimmed)) {
    return fetchAudioReference(trimmed, baseUrl, timeoutMs);
  }

  if (looksLikeBase64Audio(trimmed)) {
    return decodeBase64Audio(trimmed);
  }

  const payload = parseJsonPayload(text);
  const audio = await resolveAudioFromPayload(payload, baseUrl, timeoutMs);

  if (!audio) {
    throw new Error(`로컬 TTS 응답에서 오디오를 찾지 못했습니다: ${text.slice(0, 1200)}`);
  }

  return audio;
}

async function resolveAudioFromPayload(payload: unknown, baseUrl: string, timeoutMs: number): Promise<Buffer | null> {
  const directAudio = findStringValue(payload, [
    "audioDataUrl",
    "audio_data_url",
    "audioBase64",
    "audio_base64",
    "wavBase64",
    "wav_base64",
    "base64",
    "data"
  ]);

  if (directAudio) {
    if (directAudio.startsWith("data:")) {
      return decodeDataUrl(directAudio);
    }

    if (looksLikeAudioReference(directAudio)) {
      return fetchAudioReference(directAudio, baseUrl, timeoutMs);
    }

    return Buffer.from(stripBase64Prefix(directAudio), "base64");
  }

  const reference = findStringValue(payload, [
    "audioUrl",
    "audio_url",
    "url",
    "path",
    "fileUrl",
    "file_url",
    "filename",
    "file",
    "name",
    "output"
  ]);

  if (reference) {
    return fetchAudioReference(reference, baseUrl, timeoutMs);
  }

  return null;
}

async function fetchAudioReference(reference: string, baseUrl: string, timeoutMs: number) {
  const urls = buildAudioUrls(reference, baseUrl);
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

  throw new Error(`로컬 TTS 오디오 파일을 가져오지 못했습니다: ${describeError(lastError)}`);
}

function buildAudioUrls(reference: string, baseUrl: string) {
  const trimmed = reference.trim();
  const urls: URL[] = [];

  try {
    urls.push(new URL(trimmed, baseUrl));
  } catch {
    // Fall through to filename-based lookup.
  }

  const filename = basename(trimmed.replace(/\\/g, "/"));

  if (filename) {
    urls.push(new URL(`/audio/${filename}`, baseUrl));
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
      throw new Error(`로컬 TTS 응답 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
    }

    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      throw new Error(
        `로컬 TTS 서버에 연결하지 못했습니다. ${url.origin}/health 상태와 Start-LocalLLMApi.ps1 실행 여부를 확인해 주세요.`
      );
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
    throw new Error(`로컬 TTS 응답이 JSON 또는 오디오가 아닙니다: ${text.slice(0, 1200)}`);
  }
}

function findStringValue(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") {
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

function isLikelyAudioBuffer(buffer: Buffer) {
  return (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" ||
    buffer.subarray(0, 3).toString("ascii") === "ID3" ||
    buffer.subarray(0, 4).toString("ascii") === "OggS"
  );
}

function looksLikeAudioReference(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.includes("\\") ||
    /\.(wav|mp3|m4a|ogg)(?:$|\?)/i.test(trimmed)
  );
}

function looksLikeBase64Audio(value: string) {
  const compact = value.replace(/\s/g, "");
  if (compact.length < 600 || /[^A-Za-z0-9+/=]/.test(compact)) {
    return false;
  }

  return isLikelyAudioBuffer(Buffer.from(compact, "base64"));
}

function decodeBase64Audio(value: string) {
  const compact = value.replace(/\s/g, "");
  return Buffer.from(compact, "base64");
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);

  if (!match) {
    throw new Error("로컬 TTS data URL 형식이 올바르지 않습니다.");
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
