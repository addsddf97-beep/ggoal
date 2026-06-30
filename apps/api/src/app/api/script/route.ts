import { scriptRequestSchema } from "@food-shorts/shared";
import { generateShortsScript } from "@/lib/ai/content-generator";
import { handleApiError, jsonResponse, readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = scriptRequestSchema.parse(await readJson(request));
    const script = await generateShortsScript(body.idea, body.topic);
    return jsonResponse({ script });
  } catch (error) {
    return handleApiError(error);
  }
}

export function OPTIONS() {
  return jsonResponse({});
}
