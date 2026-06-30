import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const generatedRoot = process.env.VERCEL
  ? path.join(os.tmpdir(), "food-shorts-generated")
  : path.join(process.cwd(), "public", "generated");

export function createJobId() {
  return `job-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

export function isSafeGeneratedImageName(value: string) {
  return /^[a-zA-Z0-9._-]+$/.test(value);
}

export function getGeneratedFilePath(jobId: string, filename: string) {
  return path.join(generatedRoot, jobId, filename);
}

export function getGeneratedImagePath(jobId: string, filename: string) {
  return getGeneratedFilePath(jobId, filename);
}

export async function saveGeneratedFile(jobId: string, filename: string, file: Buffer) {
  const directory = path.join(generatedRoot, jobId);
  const filePath = path.join(directory, filename);

  await mkdir(directory, { recursive: true });
  await writeFile(filePath, file);

  return {
    imagePath: `/public/generated/${jobId}/${filename}`,
    imageUrl: `/api/generated/${jobId}/${filename}`
  };
}

export async function saveGeneratedImage(jobId: string, sceneIndex: number, image: Buffer) {
  return saveGeneratedFile(jobId, `scene-${sceneIndex}.png`, image);
}

export async function saveGeneratedArtifact(jobId: string, filename: string, file: Buffer) {
  const stored = await saveGeneratedFile(jobId, filename, file);

  return {
    artifactPath: stored.imagePath,
    artifactUrl: stored.imageUrl
  };
}
