import { z } from "zod";

export const toneOptions = [
  "분노형",
  "억울형",
  "허세형",
  "자폭형",
  "상담형",
  "해명형",
  "잔소리형"
] as const;

export const topicCandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  hook: z.string().min(1),
  foodCharacter: z.string().min(1),
  nutritionPoint: z.string().min(1),
  direction: z.string().min(1),
  tone: z.string().min(1)
});

export const sceneSchema = z.object({
  sceneIndex: z.number().int().positive(),
  duration: z.string().min(1),
  sceneTitle: z.string().min(1),
  character: z.string().min(1),
  dialogue: z.string().min(1),
  subtitle: z.string().min(1),
  visualDirection: z.string().min(1),
  cameraDirection: z.string().min(1),
  soundEffect: z.string().min(1),
  voiceTone: z.string().min(1),
  nutritionPoint: z.string().min(1),
  healthBalanceNote: z.string().min(1),
  imagePrompt: z.string().min(1)
});

export const scriptSchema = z.object({
  title: z.string().min(1),
  hook: z.string().min(1),
  totalDuration: z.string().min(1),
  scenes: z.array(sceneSchema).min(4).max(10)
});

export const sceneImageSchema = sceneSchema.extend({
  imageUrl: z.string().min(1),
  imagePath: z.string().min(1),
  imageDataUrl: z.string().min(1).optional()
});

export const sceneVideoSchema = sceneImageSchema.extend({
  audioUrl: z.string().min(1),
  audioPath: z.string().min(1),
  audioDataUrl: z.string().min(1).optional(),
  durationSeconds: z.number().positive(),
  subtitleStart: z.string().min(1),
  subtitleEnd: z.string().min(1)
});

export const topicsRequestSchema = z.object({
  idea: z.string().trim().min(1).max(240)
});

export const topicsResponseSchema = z.object({
  topics: z.array(topicCandidateSchema).length(5)
});

export const scriptRequestSchema = z.object({
  idea: z.string().trim().min(1).max(240),
  topic: topicCandidateSchema
});

export const scriptResponseSchema = z.object({
  script: scriptSchema
});

export const imagesRequestSchema = z.object({
  jobId: z.string().trim().min(1).optional(),
  scenes: z.array(sceneSchema).min(1).max(10)
});

export const imagesResponseSchema = z.object({
  jobId: z.string().min(1),
  scenes: z.array(sceneImageSchema).min(1)
});

export const videoRequestSchema = z.object({
  jobId: z.string().trim().min(1).optional(),
  scenes: z.array(sceneImageSchema).min(1).max(10),
  voice: z
    .enum(["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"])
    .optional(),
  burnSubtitles: z.boolean().optional()
});

export const videoResponseSchema = z.object({
  jobId: z.string().min(1),
  videoUrl: z.string().min(1),
  videoPath: z.string().min(1),
  videoDataUrl: z.string().min(1).optional(),
  srtUrl: z.string().min(1),
  srtPath: z.string().min(1),
  srtText: z.string().min(1).optional(),
  assUrl: z.string().min(1),
  assPath: z.string().min(1),
  assText: z.string().min(1).optional(),
  audioUrl: z.string().min(1),
  audioPath: z.string().min(1),
  audioDataUrl: z.string().min(1).optional(),
  scenes: z.array(sceneVideoSchema).min(1)
});

export type TopicCandidate = z.infer<typeof topicCandidateSchema>;
export type SceneScript = z.infer<typeof sceneSchema>;
export type ShortsScript = z.infer<typeof scriptSchema>;
export type SceneImage = z.infer<typeof sceneImageSchema>;
export type SceneVideo = z.infer<typeof sceneVideoSchema>;
export type TopicsResponse = z.infer<typeof topicsResponseSchema>;
export type ScriptResponse = z.infer<typeof scriptResponseSchema>;
export type ImagesResponse = z.infer<typeof imagesResponseSchema>;
export type VideoResponse = z.infer<typeof videoResponseSchema>;

export type ApiErrorResponse = {
  error: string;
  issues?: unknown;
};
