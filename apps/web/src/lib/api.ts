import type {
  ImagesResponse,
  SceneScript,
  ScriptResponse,
  TopicCandidate,
  TopicsResponse,
  VideoResponse
} from "@food-shorts/shared";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001").replace(/\/$/, "");

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "요청 처리 중 오류가 발생했습니다.");
  }

  return payload as TResponse;
}

export function createAbsoluteApiUrl(path: string) {
  if (path.startsWith("http")) {
    return path;
  }

  return `${apiBaseUrl}${path}`;
}

export function generateTopics(idea: string) {
  return postJson<TopicsResponse>("/api/topics", { idea });
}

export function generateScript(idea: string, topic: TopicCandidate) {
  return postJson<ScriptResponse>("/api/script", { idea, topic });
}

export async function generateImages(scenes: SceneScript[]) {
  const jobId = createClientJobId();
  const generatedScenes: ImagesResponse["scenes"] = [];

  for (const scene of scenes) {
    const response = await postJson<ImagesResponse>("/api/images", {
      jobId,
      scenes: [scene]
    });

    generatedScenes.push(...response.scenes);
  }

  return {
    jobId,
    scenes: generatedScenes
  } satisfies ImagesResponse;
}

export function generateVideo(jobId: string, scenes: ImagesResponse["scenes"]) {
  return postJson<VideoResponse>("/api/video", {
    jobId,
    scenes,
    voice: "verse",
    burnSubtitles: true
  });
}

function createClientJobId() {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `job-${Date.now()}-${suffix}`;
}
