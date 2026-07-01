import { getServerConfig } from "@/lib/env";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  response?: string;
  error?: string;
};

type GenerateOllamaTextOptions = {
  messages: OllamaMessage[];
  numPredict?: number;
};

export async function generateOllamaText({ messages, numPredict }: GenerateOllamaTextOptions) {
  const config = getServerConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ollamaRequestTimeoutMs);

  try {
    const response = await fetch(new URL("/api/chat", normalizeBaseUrl(config.ollamaBaseUrl)), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.ollamaTextModel,
        messages,
        stream: false,
        think: false,
        format: "json",
        options: {
          temperature: 0.55,
          top_p: 0.9,
          num_ctx: 4096,
          num_predict: numPredict ?? 1800
        }
      }),
      signal: controller.signal
    });

    const payloadText = await response.text();

    if (!response.ok) {
      throw new Error(`Ollama 요청 실패 (${response.status}): ${payloadText.slice(0, 1200)}`);
    }

    const payload = JSON.parse(payloadText) as OllamaChatResponse;
    const content = payload.message?.content ?? payload.response ?? "";

    if (!content.trim()) {
      throw new Error(payload.error || "Ollama 응답 텍스트가 비어 있습니다.");
    }

    return content;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama 응답 시간이 ${Math.round(config.ollamaRequestTimeoutMs / 1000)}초를 초과했습니다.`);
    }

    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      throw new Error(
        `Ollama 서버에 연결하지 못했습니다. 로컬에서 'ollama serve'가 실행 중인지, ${config.ollamaBaseUrl}에 접근 가능한지 확인해 주세요.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
