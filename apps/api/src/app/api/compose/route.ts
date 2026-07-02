import { composeRequestSchema } from "@food-shorts/shared";
import { composeShortsVideo } from "@/lib/ai/video-generator";
import { handleApiError, jsonResponse, readJson } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = composeRequestSchema.parse(await readJson(request));
    const result = await composeShortsVideo(body.scenes, {
      jobId: body.jobId,
      voice: body.voice,
      burnSubtitles: body.burnSubtitles ?? true
    });

    return jsonResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export function OPTIONS() {
  return jsonResponse({});
}
