import { ttsRequestSchema } from "@food-shorts/shared";
import { generateShortsAudio } from "@/lib/ai/video-generator";
import { handleApiError, jsonResponse, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = ttsRequestSchema.parse(await readJson(request));
    const result = await generateShortsAudio(body.scenes, {
      jobId: body.jobId,
      voice: body.voice,
      ttsSpeed: body.ttsSpeed
    });

    return jsonResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export function OPTIONS() {
  return jsonResponse({});
}
