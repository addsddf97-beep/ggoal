export type ServerConfig = {
  apiKey: string;
  textProvider: "ollama" | "openai";
  textModel: string;
  ollamaBaseUrl: string;
  ollamaTextModel: string;
  ollamaRequestTimeoutMs: number;
  imageModel: string;
  imageQuality: string;
  imageConcurrency: number;
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
  const ttsProvider = parseTtsProvider(process.env.TTS_PROVIDER);

  return {
    apiKey,
    textProvider,
    textModel: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.4-mini",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434",
    ollamaTextModel: process.env.OLLAMA_TEXT_MODEL?.trim() || "qwen3:4b",
    ollamaRequestTimeoutMs: parseBoundedInteger(process.env.OLLAMA_REQUEST_TIMEOUT_MS, 180000, 10000, 300000),
    imageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
    imageQuality: process.env.OPENAI_IMAGE_QUALITY?.trim() || "low",
    imageConcurrency: parseBoundedInteger(process.env.OPENAI_IMAGE_CONCURRENCY, 4, 1, 5),
    ttsProvider,
    ttsModel: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    ttsVoice: process.env.OPENAI_TTS_VOICE?.trim() || "verse",
    ttsConcurrency: parseBoundedInteger(
      process.env.TTS_CONCURRENCY ?? process.env.OPENAI_TTS_CONCURRENCY,
      ttsProvider === "local" ? 1 : 3,
      1,
      5
    ),
    localTtsBaseUrl: process.env.LOCAL_TTS_BASE_URL?.trim() || "http://127.0.0.1:8088",
    localTtsVoice: process.env.LOCAL_TTS_VOICE?.trim() || "Microsoft Heami Desktop",
    localTtsLanguage: process.env.LOCAL_TTS_LANGUAGE?.trim() || "ko-KR",
    localTtsRate: parseBoundedInteger(process.env.LOCAL_TTS_RATE, 1, -10, 10),
    localTtsVolume: parseBoundedInteger(process.env.LOCAL_TTS_VOLUME, 100, 0, 100),
    localTtsTimeoutMs: parseBoundedInteger(process.env.LOCAL_TTS_TIMEOUT_MS, 60000, 5000, 300000),
    videoSegmentConcurrency: parseBoundedInteger(process.env.VIDEO_SEGMENT_CONCURRENCY, 2, 1, 3),
    videoWidth: parseBoundedInteger(process.env.VIDEO_WIDTH, 720, 360, 1080),
    videoHeight: parseBoundedInteger(process.env.VIDEO_HEIGHT, 1280, 640, 1920),
    videoFps: parseBoundedInteger(process.env.VIDEO_FPS, 24, 12, 30),
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

function parseTextProvider(value: string | undefined): "ollama" | "openai" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "openai" ? "openai" : "ollama";
}

function parseTtsProvider(value: string | undefined): "local" | "openai" {
  const normalized = value?.trim().toLowerCase();
  return normalized === "openai" ? "openai" : "local";
}
