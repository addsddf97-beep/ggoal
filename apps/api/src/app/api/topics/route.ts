import { topicsRequestSchema } from "@food-shorts/shared";
import { generateTopicCandidates } from "@/lib/ai/content-generator";
import { handleApiError, jsonResponse, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = topicsRequestSchema.parse(await readJson(request));
    const topics = await generateTopicCandidates(body.idea);
    return jsonResponse({ topics });
  } catch (error) {
    return handleApiError(error);
  }
}

export function OPTIONS() {
  return jsonResponse({});
}
