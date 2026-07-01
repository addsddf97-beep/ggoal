import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import ffmpegPath from "ffmpeg-static";
import type { SceneScript } from "@food-shorts/shared";
import { createJobId, saveGeneratedImage } from "@/lib/storage";
import { getServerConfig } from "@/lib/env";
import { createMockPng } from "@/lib/ai/mock";
import { createOpenAiClient } from "@/lib/ai/openai-client";
import { createLocalImage } from "@/lib/ai/local-image-client";
import { mapWithConcurrency } from "@/lib/concurrency";

const require = createRequire(import.meta.url);

export async function generateImagesForScenes(scenes: SceneScript[], requestedJobId?: string) {
  const config = getServerConfig();
  const jobId = requestedJobId ?? createJobId();
  const results = await mapWithConcurrency(scenes, config.imageConcurrency, async (scene) => {
    const sourceImage = config.mockAi ? createMockPng(scene.sceneIndex) : await createSceneImage(scene);
    const image = await compressSceneImage(sourceImage, scene.sceneIndex);
    const stored = await saveGeneratedImage(jobId, scene.sceneIndex, image, "jpg");

    return {
      ...scene,
      ...stored,
      imageDataUrl: `data:image/jpeg;base64,${image.toString("base64")}`
    };
  });

  return {
    jobId,
    scenes: results
  };
}

async function createSceneImage(scene: SceneScript) {
  const runtimeConfig = getServerConfig();
  const prompt = [
    scene.imagePrompt,
    "Use a vertical 9:16 shorts composition.",
    "Do not render readable text, captions, logos, watermarks, or UI.",
    "Keep the bottom 20 percent visually clean for Korean subtitles added later."
  ].join(" ");

  if (runtimeConfig.imageProvider === "local") {
    return createLocalImage(prompt);
  }

  const { client, config } = createOpenAiClient();
  const response = await client.images.generate({
    model: config.imageModel,
    prompt,
    quality: config.imageQuality,
    size: "1024x1536",
    n: 1
  } as never);

  const image = response.data?.[0];

  if (image?.b64_json) {
    return Buffer.from(image.b64_json, "base64");
  }

  if (image?.url) {
    const remoteImage = await fetch(image.url);

    if (!remoteImage.ok) {
      throw new Error("생성된 이미지 URL을 다운로드하지 못했습니다.");
    }

    return Buffer.from(await remoteImage.arrayBuffer());
  }

  throw new Error("OpenAI 이미지 응답이 비어 있습니다.");
}

async function compressSceneImage(image: Buffer, sceneIndex: number) {
  const workDir = await mkdtemp(path.join(os.tmpdir(), `food-shorts-image-${sceneIndex}-`));
  const inputPath = path.join(workDir, "source.img");
  const outputPath = path.join(workDir, "scene.jpg");

  await writeFile(inputPath, image);
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=540:960:force_original_aspect_ratio=increase,crop=540:960,setsar=1",
    "-frames:v",
    "1",
    "-q:v",
    "8",
    outputPath
  ]);

  return readFile(outputPath);
}

function runFfmpeg(args: string[]) {
  return new Promise<void>(async (resolve, reject) => {
    const binaryPath = await resolveFfmpegPath();

    if (!binaryPath) {
      reject(new Error("ffmpeg binary를 찾지 못했습니다."));
      return;
    }

    const child = spawn(binaryPath, args);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`이미지 압축 실패: ${stderr.slice(-1200)}`));
      }
    });
  });
}

async function resolveFfmpegPath() {
  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath,
    resolvePackageFfmpegPath(),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(process.cwd(), "..", "..", "node_modules", "ffmpeg-static", "ffmpeg")
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function resolvePackageFfmpegPath() {
  try {
    return path.join(path.dirname(require.resolve("ffmpeg-static")), "ffmpeg");
  } catch {
    return null;
  }
}
