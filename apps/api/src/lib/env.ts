export type ServerConfig = {
  apiKey: string;
  textModel: string;
  imageModel: string;
  imageQuality: string;
  imageConcurrency: number;
  ttsModel: string;
  ttsVoice: string;
  ttsConcurrency: number;
  videoSegmentConcurrency: number;
  videoWidth: number;
  videoHeight: number;
  videoFps: number;
  useMockAi: boolean;
};

export function getServerConfig(): ServerConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const explicitMock = process.env.USE_MOCK_AI === "true";

  return {
    apiKey,
    textModel: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.4-mini",
    imageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
    imageQuality: process.env.OPENAI_IMAGE_QUALITY?.trim() || "low",
    imageConcurrency: parseBoundedInteger(process.env.OPENAI_IMAGE_CONCURRENCY, 4, 1, 5),
    ttsModel: process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts",
    ttsVoice: process.env.OPENAI_TTS_VOICE?.trim() || "verse",
    ttsConcurrency: parseBoundedInteger(process.env.OPENAI_TTS_CONCURRENCY, 3, 1, 5),
    videoSegmentConcurrency: parseBoundedInteger(process.env.VIDEO_SEGMENT_CONCURRENCY, 2, 1, 3),
    videoWidth: parseBoundedInteger(process.env.VIDEO_WIDTH, 720, 360, 1080),
    videoHeight: parseBoundedInteger(process.env.VIDEO_HEIGHT, 1280, 640, 1920),
    videoFps: parseBoundedInteger(process.env.VIDEO_FPS, 24, 12, 30),
    useMockAi: explicitMock || apiKey.length === 0
  };
}

export function assertOpenAiReady(config: ServerConfig) {
  if (!config.useMockAi && !config.apiKey) {
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
