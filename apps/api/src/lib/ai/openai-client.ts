import OpenAI from "openai";
import { assertOpenAiReady, getServerConfig } from "@/lib/env";

export function createOpenAiClient() {
  const config = getServerConfig();
  assertOpenAiReady(config);

  return {
    client: new OpenAI({ apiKey: config.apiKey }),
    config
  };
}
