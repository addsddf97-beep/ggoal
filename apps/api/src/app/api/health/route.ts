import { jsonResponse } from "@/lib/http";

export const runtime = "nodejs";

export function GET() {
  return jsonResponse({
    ok: true,
    service: "골때리는 건강 가이드 스튜디오 API"
  });
}

export function OPTIONS() {
  return jsonResponse({});
}
