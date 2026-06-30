import { imagesRequestSchema } from "@food-shorts/shared";
import { generateImagesForScenes } from "@/lib/ai/image-generator";
import { handleApiError, jsonResponse, readJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = imagesRequestSchema.parse(await readJson(request));
    const result = await generateImagesForScenes(body.scenes, body.jobId);
    return jsonResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export function OPTIONS() {
  return jsonResponse({});
}
