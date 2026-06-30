import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import ffmpegPath from "ffmpeg-static";
import type { SceneImage } from "@food-shorts/shared";
import { createJobId, getGeneratedFilePath, saveGeneratedArtifact } from "@/lib/storage";
import { getServerConfig } from "@/lib/env";
import { createOpenAiClient } from "@/lib/ai/openai-client";
import { mapWithConcurrency } from "@/lib/concurrency";

const require = createRequire(import.meta.url);

type GenerateShortsVideoOptions = {
  jobId?: string;
  voice?: string;
  burnSubtitles: boolean;
};

type PreparedScene = SceneImage & {
  durationSeconds: number;
  imageFilePath: string;
  audioFilePath: string;
  segmentFilePath: string;
  subtitleStart: string;
  subtitleEnd: string;
};

export async function generateShortsVideo(scenes: SceneImage[], options: GenerateShortsVideoOptions) {
  const config = getServerConfig();
  const jobId = options.jobId ?? createJobId();
  const workDir = path.join(os.tmpdir(), "food-shorts-video", jobId);
  await mkdir(workDir, { recursive: true });

  const preparedScenes: PreparedScene[] = [];
  let cursor = 0;

  for (const scene of scenes) {
    const durationSeconds = Math.max(parseDurationSeconds(scene.duration), estimateSpeechSeconds(scene.dialogue));
    const imageFilePath = path.join(workDir, `scene-${scene.sceneIndex}.png`);
    const audioFilePath = path.join(workDir, `scene-${scene.sceneIndex}.mp3`);
    const segmentFilePath = path.join(workDir, `segment-${scene.sceneIndex}.mp4`);
    const subtitleStart = formatSrtTime(cursor);
    const subtitleEnd = formatSrtTime(cursor + durationSeconds);

    preparedScenes.push({
      ...scene,
      durationSeconds,
      imageFilePath,
      audioFilePath,
      segmentFilePath,
      subtitleStart,
      subtitleEnd
    });

    cursor += durationSeconds;
  }

  await mapWithConcurrency(preparedScenes, config.ttsConcurrency, async (scene) => {
    await Promise.all([
      resolveSceneImage(scene, workDir),
      config.useMockAi
        ? createSilentAudio(scene.audioFilePath, scene.durationSeconds)
        : createSceneSpeech(scene, scene.audioFilePath, options.voice ?? config.ttsVoice)
    ]);
  });

  const srt = createSrt(preparedScenes);
  const ass = createAss(preparedScenes, config.videoWidth, config.videoHeight);
  const srtFilePath = path.join(workDir, "captions.srt");
  const assFilePath = path.join(workDir, "captions.ass");

  await writeFile(srtFilePath, srt);
  await writeFile(assFilePath, ass);

  const sceneAssFiles = await Promise.all(preparedScenes.map(async (scene) => {
    const sceneAssPath = path.join(workDir, `scene-${scene.sceneIndex}.ass`);
    await writeFile(
      sceneAssPath,
      createAss(
        [{ ...scene, subtitleStart: "0:00:00.00", subtitleEnd: formatAssTime(scene.durationSeconds) }],
        config.videoWidth,
        config.videoHeight
      )
    );

    return { scene, sceneAssPath };
  }));

  await mapWithConcurrency(sceneAssFiles, config.videoSegmentConcurrency, async ({ scene, sceneAssPath }) => {
    await createVideoSegment(scene, sceneAssPath, options.burnSubtitles, {
      fps: config.videoFps,
      height: config.videoHeight,
      width: config.videoWidth
    });
  });

  const concatFilePath = path.join(workDir, "segments.txt");
  await writeFile(
    concatFilePath,
    preparedScenes.map((scene) => `file '${escapeConcatPath(scene.segmentFilePath)}'`).join("\n")
  );

  const finalVideoPath = path.join(workDir, "shorts-video.mp4");
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", concatFilePath, "-c", "copy", finalVideoPath]);

  const combinedAudioPath = path.join(workDir, "voiceover.mp3");
  const audioConcatFilePath = path.join(workDir, "audio.txt");
  await writeFile(
    audioConcatFilePath,
    preparedScenes.map((scene) => `file '${escapeConcatPath(scene.audioFilePath)}'`).join("\n")
  );
  await runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", audioConcatFilePath, "-c", "copy", combinedAudioPath]);

  const [video, srtBuffer, assBuffer, audio] = await Promise.all([
    readFile(finalVideoPath),
    readFile(srtFilePath),
    readFile(assFilePath),
    readFile(combinedAudioPath)
  ]);

  const [storedVideo, storedSrt, storedAss, storedAudio, storedSceneAudio] = await Promise.all([
    saveGeneratedArtifact(jobId, "shorts-video.mp4", video),
    saveGeneratedArtifact(jobId, "captions.srt", srtBuffer),
    saveGeneratedArtifact(jobId, "captions.ass", assBuffer),
    saveGeneratedArtifact(jobId, "voiceover.mp3", audio),
    Promise.all(
      preparedScenes.map(async (scene) => {
        const audioBuffer = await readFile(scene.audioFilePath);

        return {
          sceneIndex: scene.sceneIndex,
          audioBuffer,
          stored: await saveGeneratedArtifact(jobId, `scene-${scene.sceneIndex}.mp3`, audioBuffer)
        };
      })
    )
  ]);

  return {
    jobId,
    videoUrl: storedVideo.artifactUrl,
    videoPath: storedVideo.artifactPath,
    videoDataUrl: toDataUrl("video/mp4", video),
    srtUrl: storedSrt.artifactUrl,
    srtPath: storedSrt.artifactPath,
    srtText: srt,
    assUrl: storedAss.artifactUrl,
    assPath: storedAss.artifactPath,
    assText: ass,
    audioUrl: storedAudio.artifactUrl,
    audioPath: storedAudio.artifactPath,
    audioDataUrl: toDataUrl("audio/mpeg", audio),
    scenes: preparedScenes.map((scene) => {
      const sceneAudio = storedSceneAudio.find((item) => item.sceneIndex === scene.sceneIndex);

      return {
        ...scene,
        imageFilePath: undefined,
        audioFilePath: undefined,
        segmentFilePath: undefined,
        audioUrl: sceneAudio?.stored.artifactUrl ?? `/api/generated/${jobId}/scene-${scene.sceneIndex}.mp3`,
        audioPath: sceneAudio?.stored.artifactPath ?? `/public/generated/${jobId}/scene-${scene.sceneIndex}.mp3`,
        audioDataUrl: sceneAudio ? toDataUrl("audio/mpeg", sceneAudio.audioBuffer) : undefined
      };
    })
  };
}

async function createSceneSpeech(scene: SceneImage, audioFilePath: string, voice: string) {
  const { client, config } = createOpenAiClient();
  const speech = await client.audio.speech.create({
    model: config.ttsModel,
    voice,
    input: scene.dialogue,
    response_format: "mp3",
    instructions: `Speak Korean quickly and expressively for YouTube Shorts. Voice tone guide: ${scene.voiceTone}`
  } as never);

  await writeFile(audioFilePath, Buffer.from(await speech.arrayBuffer()));
}

async function createSilentAudio(audioFilePath: string, durationSeconds: number) {
  await runFfmpeg([
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    String(durationSeconds),
    "-q:a",
    "9",
    "-acodec",
    "libmp3lame",
    audioFilePath
  ]);
}

async function createVideoSegment(
  scene: PreparedScene,
  assPath: string,
  burnSubtitles: boolean,
  video: { fps: number; height: number; width: number }
) {
  const filters = [
    `scale=${video.width}:${video.height}:force_original_aspect_ratio=increase`,
    `crop=${video.width}:${video.height}`,
    "setsar=1",
    burnSubtitles ? `subtitles=${escapeFilterPath(assPath)}` : null
  ].filter(Boolean);

  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-framerate",
    String(video.fps),
    "-t",
    String(scene.durationSeconds),
    "-i",
    scene.imageFilePath,
    "-i",
    scene.audioFilePath,
    "-vf",
    filters.join(","),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-t",
    String(scene.durationSeconds),
    scene.segmentFilePath
  ]);
}

async function resolveSceneImage(scene: SceneImage, workDir: string) {
  const outputPath = path.join(workDir, `scene-${scene.sceneIndex}.png`);

  if (scene.imageDataUrl) {
    await writeFile(outputPath, decodeDataUrl(scene.imageDataUrl));
    return outputPath;
  }

  const filename = scene.imageUrl.split("/").pop() ?? `scene-${scene.sceneIndex}.png`;
  const jobId = extractJobId(scene.imageUrl) ?? extractJobId(scene.imagePath);

  if (jobId) {
    const localPath = getGeneratedFilePath(jobId, filename);
    try {
      await access(localPath);
      await writeFile(outputPath, await readFile(localPath));
      return outputPath;
    } catch {
      // Fall through to URL fetch when the local generated file is not on this worker.
    }
  }

  if (scene.imageUrl.startsWith("http")) {
    const response = await fetch(scene.imageUrl);
    if (!response.ok) {
      throw new Error(`Scene ${scene.sceneIndex} 이미지를 불러오지 못했습니다.`);
    }
    await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
    return outputPath;
  }

  throw new Error(`Scene ${scene.sceneIndex} 이미지 파일을 찾지 못했습니다. 이미지를 다시 생성한 뒤 시도해 주세요.`);
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
        reject(new Error(`ffmpeg 실행 실패: ${stderr.slice(-1200)}`));
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

function parseDurationSeconds(duration: string) {
  const match = duration.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 5;
}

function estimateSpeechSeconds(text: string) {
  return Math.max(4, Math.ceil(text.replace(/\s/g, "").length / 5.5) + 1);
}

function createSrt(scenes: PreparedScene[]) {
  return scenes
    .map((scene, index) =>
      [
        String(index + 1),
        `${scene.subtitleStart} --> ${scene.subtitleEnd}`,
        scene.subtitle,
        scene.dialogue
      ].join("\n")
    )
    .join("\n\n");
}

function createAss(
  scenes: Array<Pick<PreparedScene, "subtitle" | "dialogue" | "subtitleStart" | "subtitleEnd">>,
  width: number,
  height: number
) {
  const fontSize = Math.round(height * 0.031);
  const outline = Math.max(3, Math.round(height * 0.0026));
  const shadow = Math.max(1, Math.round(height * 0.001));
  const horizontalMargin = Math.round(width * 0.065);
  const bottomMargin = Math.round(height * 0.1);
  const events = scenes
    .map((scene) => {
      const text = `${escapeAssText(scene.subtitle)}\\N${escapeAssText(scene.dialogue)}`;
      return `Dialogue: 0,${toAssTimestamp(scene.subtitleStart)},${toAssTimestamp(scene.subtitleEnd)},Default,,0,0,0,,${text}`;
    })
    .join("\n");

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H000000FF,&H00141414,&H99000000,-1,0,0,0,100,100,0,0,1,${outline},${shadow},2,${horizontalMargin},${horizontalMargin},${bottomMargin},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;
}

function formatSrtTime(seconds: number) {
  const totalMs = Math.round(seconds * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const wholeSeconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;

  return `${pad(hours)}:${pad(minutes)}:${pad(wholeSeconds)},${String(milliseconds).padStart(3, "0")}`;
}

function formatAssTime(seconds: number) {
  const totalCentiseconds = Math.round(seconds * 100);
  const hours = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const wholeSeconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;

  return `${hours}:${pad(minutes)}:${pad(wholeSeconds)}.${String(centiseconds).padStart(2, "0")}`;
}

function toAssTimestamp(srtTime: string) {
  const match = srtTime.match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);
  if (!match) return srtTime;

  const [, hours, minutes, seconds, milliseconds] = match;
  const centiseconds = Math.round(Number(milliseconds) / 10);
  return `${Number(hours)}:${minutes}:${seconds}.${String(centiseconds).padStart(2, "0")}`;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function escapeAssText(text: string) {
  return text.replace(/[{}]/g, "").replace(/\n/g, "\\N");
}

function escapeConcatPath(filePath: string) {
  return filePath.replace(/'/g, "'\\''");
}

function escapeFilterPath(filePath: string) {
  return filePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function extractJobId(value: string) {
  const match = value.match(/generated\/([^/]+)\//);
  return match?.[1];
}

function decodeDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) {
    throw new Error("이미지 data URL 형식이 올바르지 않습니다.");
  }
  return Buffer.from(match[1], "base64");
}

function toDataUrl(mimeType: string, file: Buffer) {
  return `data:${mimeType};base64,${file.toString("base64")}`;
}
