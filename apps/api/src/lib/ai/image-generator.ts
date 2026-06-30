import type { SceneScript } from "@food-shorts/shared";
import { createJobId, saveGeneratedImage } from "@/lib/storage";
import { getServerConfig } from "@/lib/env";
import { createMockPng } from "@/lib/ai/mock";
import { createOpenAiClient } from "@/lib/ai/openai-client";

export async function generateImagesForScenes(scenes: SceneScript[], requestedJobId?: string) {
  const config = getServerConfig();
  const jobId = requestedJobId ?? createJobId();
  const results = [];

  for (const scene of scenes) {
    const image = config.useMockAi ? createMockPng(scene.sceneIndex) : await createSceneImage(scene);
    const stored = await saveGeneratedImage(jobId, scene.sceneIndex, image);

    results.push({
      ...scene,
      ...stored
    });
  }

  return {
    jobId,
    scenes: results
  };
}

async function createSceneImage(scene: SceneScript) {
  const { client, config } = createOpenAiClient();
  const response = await client.images.generate({
    model: config.imageModel,
    prompt: [
      scene.imagePrompt,
      "Use a vertical 9:16 shorts composition.",
      "Do not render readable text, captions, logos, watermarks, or UI.",
      "Keep the bottom 20 percent visually clean for Korean subtitles added later."
    ].join(" "),
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
