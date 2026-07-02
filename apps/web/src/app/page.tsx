"use client";

import type { ImagesResponse, ShortsScript, TtsResponse, TopicCandidate, VideoResponse } from "@food-shorts/shared";
import {
  ArrowLeft,
  Captions,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic2,
  RefreshCcw,
  ScrollText,
  Sparkles,
  Video,
  WandSparkles
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import {
  createAbsoluteApiUrl,
  composeVideoFromAudio,
  generateAudio,
  generateImages,
  generateScript,
  generateTopics
} from "@/lib/api";
import { downloadJson, formatPromptsForClipboard, formatScriptForClipboard } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { SceneResultCard } from "@/components/SceneResultCard";
import { StepRail } from "@/components/StepRail";
import { TopicCard } from "@/components/TopicCard";

const examples = ["라면", "치킨", "콜라", "떡볶이", "편의점 도시락"];

export default function Home() {
  const [idea, setIdea] = useState("");
  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState<TopicCandidate[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [script, setScript] = useState<ShortsScript | null>(null);
  const [images, setImages] = useState<ImagesResponse | null>(null);
  const [audio, setAudio] = useState<TtsResponse | null>(null);
  const [video, setVideo] = useState<VideoResponse | null>(null);
  const [loading, setLoading] = useState<"topics" | "script" | "images" | "audio" | "video" | null>(null);
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [error, setError] = useState("");

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic.id === selectedTopicId) ?? null,
    [selectedTopicId, topics]
  );

  async function handleTopics(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idea.trim()) {
      setError("음식 이름이나 아이디어를 입력해 주세요.");
      return;
    }

    setError("");
    setLoading("topics");
    setImages(null);
    setScript(null);
    setAudio(null);
    setVideo(null);
    setSelectedTopicId("");

    try {
      const response = await generateTopics(idea);
      setTopics(response.topics);
      setSelectedTopicId(response.topics[0]?.id ?? "");
      setStep(2);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "주제 후보 생성에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function handleScript() {
    if (!selectedTopic) {
      setError("주제 후보를 선택해 주세요.");
      return;
    }

    setError("");
    setLoading("script");
    setImages(null);
    setAudio(null);
    setVideo(null);

    try {
      const response = await generateScript(idea, selectedTopic);
      setScript(response.script);
      setStep(3);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "스크립트 생성에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function handleImages() {
    if (!script) {
      setError("스크립트를 먼저 생성해 주세요.");
      return;
    }

    setError("");
    setLoading("images");
    setAudio(null);
    setVideo(null);

    try {
      const response = await generateImages(script.scenes);
      setImages(response);
      setStep(4);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "이미지 생성에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function handleAudio() {
    if (!images) {
      setError("이미지를 먼저 생성해 주세요.");
      return;
    }

    setError("");
    setLoading("audio");

    try {
      const response = await generateAudio(images.jobId, images.scenes, ttsSpeed);
      setAudio(response);
      setStep(5);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "TTS 생성에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function handleCompose() {
    if (!audio) {
      setError("TTS 결과를 먼저 생성해 주세요.");
      return;
    }

    setError("");
    setLoading("video");

    try {
      const response = await composeVideoFromAudio(audio.jobId, audio.scenes);
      setVideo(response);
      setStep(5);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "영상 생성에 실패했습니다.");
    } finally {
      setLoading(null);
    }
  }

  function resetWorkflow() {
    setStep(1);
    setTopics([]);
    setSelectedTopicId("");
    setScript(null);
    setImages(null);
    setAudio(null);
    setVideo(null);
    setError("");
  }

  const scriptClipboard = script ? formatScriptForClipboard(script) : "";
  const promptClipboard = script ? formatPromptsForClipboard(script.scenes) : "";
  const videoSrc = video?.videoDataUrl ?? (video ? createAbsoluteApiUrl(video.videoUrl) : "");
  const srtSrc = video?.srtText
    ? `data:text/plain;charset=utf-8,${encodeURIComponent(video.srtText)}`
    : video
      ? createAbsoluteApiUrl(video.srtUrl)
      : "";

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-4 lg:px-6">
        <header className="grid gap-3 border-b border-ink/10 pb-3 lg:grid-cols-[1fr_260px] lg:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-black text-ink">
              <Sparkles className="h-4 w-4 text-punch" aria-hidden />
              골때리는 건강 가이드 스튜디오
            </div>
            <h1 className="max-w-3xl text-2xl font-black leading-tight text-ink md:text-3xl">
              음식 캐릭터 상황극 숏츠 제작
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/70">
              입력부터 주제 후보, 씬별 대본, 캐릭터 이미지까지 한 번에 만드는 제작 워크플로우입니다.
            </p>
          </div>

          <img
            src="/brand/studio-preview.svg"
            alt="음식 캐릭터 스튜디오 미리보기"
            className="hidden h-28 w-full rounded-lg border border-ink/10 object-cover shadow-crisp lg:block"
          />
        </header>

        <StepRail currentStep={step} />

        {error ? (
          <div className="rounded-lg border border-punch bg-punch/10 px-4 py-3 text-sm font-bold text-ink" role="alert">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <aside className="h-fit rounded-lg border border-ink/10 bg-white p-3 shadow-crisp">
            <form onSubmit={handleTopics} className="space-y-3">
              <label htmlFor="idea" className="block text-sm font-black text-ink">
                음식/아이디어 입력
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="예: 라면, 치킨, 콜라, 떡볶이, 편의점 도시락"
                className="min-h-24 w-full resize-none rounded-lg border border-ink/15 bg-paper px-3 py-2.5 text-sm font-semibold leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-ink focus:bg-white"
              />

              <div className="flex flex-wrap gap-2">
                {examples.map((example) => (
                  <button
                    type="button"
                    key={example}
                    onClick={() => setIdea(example)}
                    className="rounded-md border border-ink/10 bg-white px-3 py-1.5 text-sm font-bold text-ink/75 transition hover:border-ink hover:text-ink"
                  >
                    {example}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading !== null}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-black text-white transition hover:bg-punch disabled:bg-ink/35"
              >
                {loading === "topics" ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <WandSparkles className="h-5 w-5" aria-hidden />
                )}
                주제 후보 생성
              </button>
            </form>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1 || loading !== null}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white text-sm font-bold text-ink transition hover:border-ink disabled:text-ink/30"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                이전
              </button>
              <button
                type="button"
                onClick={resetWorkflow}
                disabled={loading !== null}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white text-sm font-bold text-ink transition hover:border-ink disabled:text-ink/30"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden />
                처음부터
              </button>
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="rounded-lg border border-ink/10 bg-white p-3 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 2</p>
                  <h2 className="text-xl font-black text-ink">숏츠 주제 후보</h2>
                </div>
                <button
                  type="button"
                  onClick={handleScript}
                  disabled={!selectedTopic || loading !== null}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-mint px-4 text-sm font-black text-ink transition hover:bg-citrus disabled:bg-ink/20 disabled:text-ink/45"
                >
                  {loading === "script" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <ScrollText className="h-4 w-4" aria-hidden />
                  )}
                  스크립트 생성
                </button>
              </div>

              {topics.length > 0 ? (
                <div className="mt-3 grid gap-3 xl:grid-cols-2">
                  {topics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      selected={selectedTopicId === topic.id}
                      onSelect={() => setSelectedTopicId(topic.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm font-bold text-ink/50">
                  주제 후보가 여기에 표시됩니다.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-3 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 3</p>
                  <h2 className="text-xl font-black text-ink">음식 캐릭터 상황극 스크립트</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {script ? <CopyButton label="전체 대본" value={scriptClipboard} compact /> : null}
                  {script ? <CopyButton label="프롬프트" value={promptClipboard} compact /> : null}
                  <button
                    type="button"
                    onClick={handleImages}
                    disabled={!script || loading !== null}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white transition hover:bg-punch disabled:bg-ink/25"
                  >
                    {loading === "images" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <ImageIcon className="h-4 w-4" aria-hidden />
                    )}
                    이미지 생성
                  </button>
                </div>
              </div>

              {script ? (
                <div className="mt-3 space-y-3">
                  <div className="border-b border-ink/10 pb-3">
                    <h3 className="text-lg font-black text-ink">{script.title}</h3>
                    <p className="mt-1 text-sm font-bold text-punch">{script.hook}</p>
                    <p className="mt-2 text-sm font-semibold text-ink/60">총 길이: {script.totalDuration}</p>
                  </div>

                  <div className="grid gap-3">
                    {script.scenes.map((scene) => (
                      <article key={scene.sceneIndex} className="rounded-lg border border-ink/10 bg-paper p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-punch">Scene {scene.sceneIndex} · {scene.duration}</p>
                            <h4 className="text-base font-black text-ink">{scene.sceneTitle}</h4>
                          </div>
                          <span className="rounded-md bg-citrus/70 px-2.5 py-1 text-xs font-black text-ink">
                            {scene.voiceTone}
                          </span>
                        </div>
                        <dl className="mt-3 grid gap-3 text-sm text-ink/75 md:grid-cols-2">
                          <div>
                            <dt className="font-bold text-ink">대사</dt>
                            <dd>{scene.dialogue}</dd>
                          </div>
                          <div>
                            <dt className="font-bold text-ink">자막</dt>
                            <dd>{scene.subtitle}</dd>
                          </div>
                          <div>
                            <dt className="font-bold text-ink">화면 연출</dt>
                            <dd>{scene.visualDirection}</dd>
                          </div>
                          <div>
                            <dt className="font-bold text-ink">균형 메모</dt>
                            <dd>{scene.healthBalanceNote}</dd>
                          </div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm font-bold text-ink/50">
                  선택한 주제로 생성된 씬별 스크립트가 여기에 표시됩니다.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-3 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 4</p>
                  <h2 className="text-xl font-black text-ink">씬별 이미지 생성 결과</h2>
                </div>
                {images ? (
                  <button
                    type="button"
                    onClick={() => downloadJson(`${images.jobId}.json`, { idea, selectedTopic, script, images })}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-bold text-ink transition hover:border-ink"
                  >
                    <Download className="h-4 w-4" aria-hidden />
                    JSON
                  </button>
                ) : null}
                {images ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex min-h-9 flex-1 min-w-0 items-center gap-2 rounded-md border border-ink/15 bg-paper px-3 text-sm font-bold text-ink">
                      <span className="whitespace-nowrap">TTS 배속</span>
                      <input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.05}
                        value={ttsSpeed}
                        onChange={(event) => setTtsSpeed(Number(event.target.value))}
                        className="h-2 w-40 flex-1 cursor-pointer"
                      />
                      <span className="min-w-14 text-right">{ttsSpeed.toFixed(2)}x</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAudio}
                      disabled={!images || loading !== null}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white transition hover:bg-punch disabled:bg-ink/25"
                    >
                      {loading === "audio" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Mic2 className="h-4 w-4" aria-hidden />
                      )}
                      TTS 생성
                    </button>
                  </div>
                ) : null}
              </div>

              {images ? (
                <div className="mt-3 space-y-3">
                  {images.scenes.map((scene) => (
                    <SceneResultCard key={scene.sceneIndex} scene={scene} />
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm font-bold text-ink/50">
                  생성된 음식 캐릭터 이미지와 결과 카드가 여기에 표시됩니다.
                </div>
              )}

              {images ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {images.scenes.map((scene) => (
                    <a
                      key={scene.sceneIndex}
                      href={scene.imageDataUrl ?? `${createAbsoluteApiUrl(scene.imageUrl)}?download=true`}
                      download={`scene-${scene.sceneIndex}.${scene.imageDataUrl?.startsWith("data:image/jpeg") || scene.imageUrl.endsWith(".jpg") ? "jpg" : "png"}`}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-bold text-ink transition hover:border-ink"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Scene {scene.sceneIndex}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-3 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 5</p>
                  <h2 className="text-xl font-black text-ink">TTS·자막·영상 합성</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {audio ? (
                    <button
                      type="button"
                      onClick={handleCompose}
                      disabled={loading !== null}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white transition hover:bg-punch disabled:bg-ink/25"
                    >
                      {loading === "video" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Film className="h-4 w-4" aria-hidden />
                      )}
                      영상 합성
                    </button>
                  ) : null}

                  {(video || audio) ? (
                    <button
                      type="button"
                      onClick={() =>
                        downloadJson(`${audio?.jobId ?? video?.jobId}-result.json`, {
                          idea,
                          selectedTopic,
                          script,
                          images,
                          audio,
                          video
                        })
                      }
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-bold text-ink transition hover:border-ink"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      JSON
                    </button>
                  ) : null}
                </div>
              </div>

              {video ? (
                <div className="mt-3 grid gap-4 lg:grid-cols-[260px_1fr]">
                  <div className="overflow-hidden rounded-lg border border-ink/10 bg-ink">
                    <video
                      controls
                      playsInline
                      className="aspect-[9/16] w-full bg-ink object-contain"
                      src={videoSrc}
                    >
                      <track
                        kind="subtitles"
                        srcLang="ko"
                        label="한국어"
                        src={srtSrc}
                        default
                      />
                    </video>
                  </div>

                  <div className="min-w-0 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <a
                        href={video.videoDataUrl ?? `${createAbsoluteApiUrl(video.videoUrl)}?download=true`}
                        download="shorts-video.mp4"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-black text-white transition hover:bg-punch"
                      >
                        <Video className="h-4 w-4" aria-hidden />
                        MP4
                      </a>
                      <a
                        href={video.audioDataUrl ?? `${createAbsoluteApiUrl(video.audioUrl)}?download=true`}
                        download="voiceover.mp3"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-black text-ink transition hover:border-ink"
                      >
                        <Mic2 className="h-4 w-4" aria-hidden />
                        TTS
                      </a>
                      <a
                        href={srtSrc || `${createAbsoluteApiUrl(video.srtUrl)}?download=true`}
                        download="captions.srt"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-black text-ink transition hover:border-ink"
                      >
                        <Captions className="h-4 w-4" aria-hidden />
                        SRT
                      </a>
                    </div>

                    <div className="rounded-lg border border-ink/10 bg-paper p-3">
                      <h3 className="text-base font-black text-ink">씬별 음성 클립</h3>
                      <div className="mt-3 grid gap-3">
                        {video.scenes.map((scene) => (
                          <article key={scene.sceneIndex} className="rounded-md border border-ink/10 bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-xs font-black text-punch">Scene {scene.sceneIndex}</p>
                                <p className="text-sm font-bold text-ink">{scene.sceneTitle}</p>
                              </div>
                              <span className="rounded-md bg-mint/15 px-2.5 py-1 text-xs font-black text-ink">
                                {scene.durationSeconds.toFixed(1)}초
                              </span>
                            </div>
                            <audio
                              controls
                              className="mt-2 w-full"
                              src={scene.audioDataUrl ?? createAbsoluteApiUrl(scene.audioUrl)}
                            />
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : audio ? (
                <div className="mt-3 grid gap-3">
                  {audio.scenes.map((scene) => (
                    <article key={scene.sceneIndex} className="rounded-md border border-ink/10 bg-paper p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-punch">Scene {scene.sceneIndex}</p>
                          <p className="text-sm font-bold text-ink">{scene.sceneTitle}</p>
                        </div>
                        <span className="rounded-md bg-mint/15 px-2.5 py-1 text-xs font-black text-ink">
                          {scene.durationSeconds.toFixed(1)}초
                        </span>
                      </div>
                      <audio
                        controls
                        className="mt-2 w-full"
                        src={scene.audioDataUrl ?? createAbsoluteApiUrl(scene.audioUrl)}
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm font-bold text-ink/50">
                  씬별 이미지가 준비되면 먼저 TTS를 생성하고, 이어서 영상 합성으로 넘어가세요.
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
