import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { corsHeaders, handleApiError } from "@/lib/http";
import { getGeneratedFilePath, isSafeGeneratedImageName } from "@/lib/storage";

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

    const filePath = getGeneratedFilePath(jobId, filename);
    const file = await readFile(filePath);
    const download = request.nextUrl.searchParams.get("download") === "true";

    return new Response(file, {
      headers: {
        ...corsHeaders,
        "Content-Type": getContentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
        ...(download ? { "Content-Disposition": `attachment; filename="${path.basename(filename)}"` } : {})
      }
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    return handleApiError(error);
  }
}

export function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

function getContentType(filename: string) {
  if (filename.endsWith(".mp4")) return "video/mp4";
  if (filename.endsWith(".mp3")) return "audio/mpeg";
  if (filename.endsWith(".srt")) return "application/x-subrip; charset=utf-8";
  if (filename.endsWith(".ass")) return "text/plain; charset=utf-8";
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function isMissingFileError(error: unknown) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
