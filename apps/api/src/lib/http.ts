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

  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  const status = message.includes("OPENAI_API_KEY") ? 401 : 500;

  return jsonResponse({ error: message }, { status });
}
