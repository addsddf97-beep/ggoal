export type ServerConfig = {
  apiKey: string;
  textModel: string;
  imageModel: string;
  useMockAi: boolean;
};

export function getServerConfig(): ServerConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  const explicitMock = process.env.USE_MOCK_AI === "true";

  return {
    apiKey,
    textModel: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.4-mini",
    imageModel: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1.5",
    useMockAi: explicitMock || apiKey.length === 0
  };
}

export function assertOpenAiReady(config: ServerConfig) {
  if (!config.useMockAi && !config.apiKey) {
    throw new Error("OPENAI_API_KEY is required when USE_MOCK_AI=false.");
  }
}
