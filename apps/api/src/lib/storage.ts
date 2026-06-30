import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedRoot = path.join(process.cwd(), "public", "generated");

export function createJobId() {
  return `job-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export function isSafeGeneratedImageName(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

export function getGeneratedImagePath(jobId: string, filename: string) {
  return path.join(generatedRoot, jobId, filename);
}

export async function saveGeneratedImage(jobId: string, sceneIndex: number, image: Buffer) {
  const directory = path.join(generatedRoot, jobId);
  const filename = `scene-${sceneIndex}.png`;
  const filePath = path.join(directory, filename);

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, image);

  return {
    imagePath: `/public/generated/${jobId}/${filename}`,
    imageUrl: `/api/generated/${jobId}/${filename}`
  };
}
