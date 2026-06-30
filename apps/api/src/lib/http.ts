import { ZodError } from "zod";

export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.WEB_ORIGIN ?? "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new Error("요청 본문이 올바른 JSON이 아닙니다.");
  }
}

export function jsonResponse(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders,
      ...(init?.headers ?? {})
    }
  });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonResponse(
      {
        error: "요청 또는 AI 응답 구조가 올바르지 않습니다.",
        issues: error.flatten()
      },
      { status: 400 }
    );
  }

  if (isOpenAiQuotaError(error)) {
    return jsonResponse(
      {
        error:
          "OpenAI API 사용량 또는 결제 한도를 초과했습니다. OpenAI Billing에서 결제수단, 남은 크레딧, 월 사용 한도를 확인해 주세요. 개발/시연만 필요하면 USE_MOCK_AI=true로 전환할 수 있습니다."
      },
      { status: 429 }
    );
  }

  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  const status = message.includes("OPENAI_API_KEY") ? 401 : 500;

  return jsonResponse({ error: message }, { status });
}

function isOpenAiQuotaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: unknown;
    error?: { code?: unknown; type?: unknown };
    message?: unknown;
    status?: unknown;
    type?: unknown;
  };
  const message = typeof maybeError.message === "string" ? maybeError.message.toLowerCase() : "";
  const code = String(maybeError.code ?? maybeError.error?.code ?? "").toLowerCase();
  const type = String(maybeError.type ?? maybeError.error?.type ?? "").toLowerCase();

  return (
    maybeError.status === 429 &&
    (code.includes("insufficient_quota") ||
      type.includes("insufficient_quota") ||
      message.includes("exceeded your current quota") ||
      message.includes("check your plan and billing"))
  );
}
