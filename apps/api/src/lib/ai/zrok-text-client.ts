import { getServerConfig } from "@/lib/env";

export type ZrokMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GenerateZrokTextOptions = {
  messages: ZrokMessage[];
  maxTokens?: number;
};

class ZrokTextRequestError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export async function generateZrokText({ messages, maxTokens }: GenerateZrokTextOptions) {
  const config = getServerConfig();
  const baseUrl = normalizeBaseUrl(config.zrokAiBaseUrl);

  try {
    return await createOpenAiCompatibleCompletion(baseUrl, messages, maxTokens, config);
  } catch (error) {
    if (!(error instanceof ZrokTextRequestError) || ![400, 404, 415, 422].includes(error.status)) {
      throw error;
    }

    return createSimpleChatCompletion(baseUrl, messages, maxTokens, config, error);
  }
}

async function createOpenAiCompatibleCompletion(
  baseUrl: string,
  messages: ZrokMessage[],
  maxTokens: number | undefined,
  config: ReturnType<typeof getServerConfig>
) {
  const response = await fetchWithTimeout(
    new URL("/v1/chat/completions", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.zrokTextModel,
        messages,
        stream: false,
        temperature: 0.45,
        max_tokens: maxTokens ?? 1800
      })
    },
    config.zrokRequestTimeoutMs
  );

  return readTextResponse(response);
}

async function createSimpleChatCompletion(
  baseUrl: string,
  messages: ZrokMessage[],
  maxTokens: number | undefined,
  config: ReturnType<typeof getServerConfig>,
  previousError: unknown
) {
  const response = await fetchWithTimeout(
    new URL("/chat", baseUrl),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: flattenMessages(messages),
        temperature: 0.45,
        max_tokens: maxTokens ?? 1800
      })
    },
    config.zrokRequestTimeoutMs
  );

  try {
    return await readTextResponse(response);
  } catch (error) {
    throw new Error(`zrok 텍스트 API 호출 실패: ${describeError(previousError)} / ${describeError(error)}`);
  }
}

async function readTextResponse(response: Response) {
  const body = await response.text();

  if (!response.ok) {
    const hint =
      response.status === 504
        ? " zrok gateway timeout입니다. 모델 서버가 60초 안에 응답하도록 토큰 제한, /no_think, 모델 상태를 확인해 주세요."
        : "";
    throw new ZrokTextRequestError(response.status, `zrok 텍스트 요청 실패 (${response.status}): ${body.slice(0, 1200)}${hint}`);
  }

  const text = extractText(body);

  if (!text.trim()) {
    throw new Error(`zrok 텍스트 응답이 비어 있습니다: ${body.slice(0, 1200)}`);
  }

  return text;
}

function extractText(body: string) {
  try {
    const payload = JSON.parse(body) as unknown;
    const extracted = findStringValue(payload, ["content", "response", "message", "text", "output"]);

    if (extracted) {
      return extracted;
    }
  } catch {
    // Plain text responses are valid.
  }

  return body;
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

  const record = value as Record<string, unknown>;

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

function flattenMessages(messages: ZrokMessage[]) {
  return messages.map((message) => `${message.role.toUpperCase()}:\n${message.content}`).join("\n\n");
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
      throw new Error(`zrok 텍스트 응답 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다.`);
    }

    if (error instanceof TypeError && error.message.includes("fetch failed")) {
      throw new Error(`zrok 텍스트 서버에 연결하지 못했습니다. ${url.origin}/health 상태를 확인해 주세요.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
