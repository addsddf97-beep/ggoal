export type ServerConfig = {
  apiKey: string;
  textProvider: "zrok" | "ollama" | "openai";
  textModel: string;
  zrokAiBaseUrl: string;
  zrokTextModel: string;
  zrokRequestTimeoutMs: number;
  ollamaBaseUrl: string;
  ollamaTextModel: string;
  ollamaRequestTimeoutMs: number;
  imageProvider: "local" | "openai";
  imageModel: string;
  imageQuality: string;
  localImageApi: "comfyui" | "legacy";
  imageConcurrency: number;
  localImageBaseUrl: string;
  localImageModel: string;
  localImageSize: string;
  localImageSeed: number;
  localImageCfgScale: number;
  localImageTemperature: number;
  localImageSteps: number;
  localImageSampler: string;
  localImageScheduler: string;
  localImageNegativePrompt: string;
  localImageTimeoutMs: number;
  ttsProvider: "local" | "openai";
  ttsModel: string;
  ttsVoice: string;
  ttsConcurrency: number;
  localTtsBaseUrl: string;
  localTtsVoice: string;
  localTtsLanguage: string;
  localTtsRate: number;
  localTtsVolume: number;
  localTtsTimeoutMs: number;
  videoSegmentConcurrency: number;
  videoWidth: number;
  videoHeight: number;
  videoFps: number;
  mockAi: boolean;
  useMockAi: boolean;
};

export function getServerConfig(): ServerConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const explicitMock = process.env.USE_MOCK_AI === "true";
  const textProvider = parseTextProvider(process.env.TEXT_AI_PROVIDER);
  const imageProvider = parseImageProvider(process.env.IMAGE_PROVIDER);
  const localImageApi = parseLocalImageApi(process.env.LOCAL_IMAGE_API);
  const ttsProvider = parseTtsProvider(process.env.TTS_PROVIDER);

  return {
    apiKey,
    textProvider,
    textModel: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.4-mini",
    zrokAiBaseUrl: process.env.ZROK_AI_BASE_URL?.trim() || "https://ym1mvbhf9e0w.shares.zrok.io",
    zrokTextModel: process.env.ZROK_TEXT_MODEL?.trim() || "local-qwen-4b",
    zrokRequestTimeoutMs: parseBoundedInteger(process.env.ZROK_REQUEST_TIMEOUT_MS, 30000, 5000, 55000),
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
    ollamaTextModel: process.env.OLLAMA_TEXT_MODEL?.trim() || "qwen3:4b",
    ollamaRequestTimeoutMs: parseBoundedInteger(process.env.OLLAMA_REQUEST_TIMEOUT_MS, 180000, 10000, 300000),
    imageProvider,
    imageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
    imageQuality: process.env.OPENAI_IMAGE_QUALITY?.trim() || "low",
    localImageApi,
    imageConcurrency: parseBoundedInteger(
      process.env.IMAGE_CONCURRENCY ?? process.env.OPENAI_IMAGE_CONCURRENCY,
      imageProvider === "local" && localImageApi === "legacy" ? 1 : 4,
      1,
      5
    ),
    localImageBaseUrl: process.env.LOCAL_IMAGE_BASE_URL?.trim() || "https://8cauqh4loyzr.shares.zrok.io",
    localImageModel:
      process.env.LOCAL_IMAGE_MODEL?.trim() ||
      (localImageApi === "legacy" ? "FLUX.2 Klein 4B mflux 4bit" : "sd_xl_base_1.0.safetensors"),
    localImageSize: process.env.LOCAL_IMAGE_SIZE?.trim() || "512x512",
    localImageSeed: parseBoundedInteger(process.env.LOCAL_IMAGE_SEED, 42, 0, 2147483647),
    localImageCfgScale: parseBoundedNumber(process.env.LOCAL_IMAGE_CFG_SCALE, 7.5, 0, 30),
    localImageTemperature: parseBoundedNumber(process.env.LOCAL_IMAGE_TEMPERATURE, 1.0, 0, 5),
    localImageSteps: parseBoundedInteger(process.env.LOCAL_IMAGE_STEPS, 4, 1, 80),
    localImageSampler: process.env.LOCAL_IMAGE_SAMPLER?.trim() || "euler",
    localImageScheduler: process.env.LOCAL_IMAGE_SCHEDULER?.trim() || "normal",
    localImageNegativePrompt:
      process.env.LOCAL_IMAGE_NEGATIVE_PROMPT?.trim() ||
      "text, watermark, logo, blurry, low quality, distorted hands, extra fingers",
    localImageTimeoutMs: parseBoundedInteger(process.env.LOCAL_IMAGE_TIMEOUT_MS, 180000, 10000, 300000),
    ttsProvider,
    ttsModel: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    ttsVoice: process.env.OPENAI_TTS_VOICE?.trim() || "verse",
    ttsConcurrency: parseBoundedInteger(
      process.env.TTS_CONCURRENCY ?? process.env.OPENAI_TTS_CONCURRENCY,
      ttsProvider === "local" ? 4 : 3,
      1,
      5
    ),
    localTtsBaseUrl: process.env.LOCAL_TTS_BASE_URL?.trim() || "https://w3mzn1l1ted0.shares.zrok.io",
    localTtsVoice: process.env.LOCAL_TTS_VOICE?.trim() || "유나",
    localTtsLanguage: process.env.LOCAL_TTS_LANGUAGE?.trim() || "ko-KR",
    localTtsRate: parseBoundedInteger(process.env.LOCAL_TTS_RATE, 1, -10, 10),
    localTtsVolume: parseBoundedInteger(process.env.LOCAL_TTS_VOLUME, 100, 0, 100),
    localTtsTimeoutMs: parseBoundedInteger(process.env.LOCAL_TTS_TIMEOUT_MS, 12000, 5000, 300000),
    videoSegmentConcurrency: parseBoundedInteger(process.env.VIDEO_SEGMENT_CONCURRENCY, 2, 1, 3),
    videoWidth: parseBoundedInteger(process.env.VIDEO_WIDTH, 720, 360, 1080),
    videoHeight: parseBoundedInteger(process.env.VIDEO_HEIGHT, 1280, 640, 1920),
    videoFps: parseBoundedInteger(process.env.VIDEO_FPS, 24, 1, 30),
    mockAi: explicitMock,
    useMockAi: explicitMock || apiKey.length === 0
  };
}

export function assertOpenAiReady(config: ServerConfig) {
  if (!config.apiKey) {
    throw new Error("OPENAI_API_KEY is required when USE_MOCK_AI=false.");
  }
}

function parseBoundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseBoundedNumber(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseTextProvider(value: string | undefined): "zrok" | "ollama" | "openai" {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "openai" || normalized === "ollama") {
    return normalized;
  }

  if (normalized === "local" || normalized === "zrok") {
    return "zrok";
  }

  return "zrok";
}

function parseImageProvider(value: string | undefined): "local" | "openai" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "openai" ? "openai" : "local";
}

function parseLocalImageApi(value: string | undefined): "comfyui" | "legacy" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "comfyui" ? "comfyui" : "legacy";
}

function parseTtsProvider(value: string | undefined): "local" | "openai" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "openai" ? "openai" : "local";
}
