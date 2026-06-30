import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { corsHeaders, handleApiError } from "@/lib/http";
import { getGeneratedImagePath, isSafeGeneratedImageName } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ jobId: string; filename: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { jobId, filename } = await context.params;

    if (!isSafeGeneratedImageName(jobId) || !isSafeGeneratedImageName(filename)) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const imagePath = getGeneratedImagePath(jobId, filename);
    const image = await readFile(imagePath);
    const download = request.nextUrl.searchParams.get("download") === "true";

    return new Response(image, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(download ? { "Content-Disposition": `attachment; filename="${path.basename(filename)}"` } : {})
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}
