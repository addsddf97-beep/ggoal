"use client";

import type { ImagesResponse, ShortsScript, TopicCandidate } from "@food-shorts/shared";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Loader2,
  RefreshCcw,
  ScrollText,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { createAbsoluteApiUrl, generateImages, generateScript, generateTopics } from "@/lib/api";
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
  const [loading, setLoading] = useState<"topics" | "script" | "images" | null>(null);
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

  function resetWorkflow() {
    setStep(1);
    setTopics([]);
    setSelectedTopicId("");
    setScript(null);
    setImages(null);
    setError("");
  }

  const scriptClipboard = script ? formatScriptForClipboard(script) : "";
  const promptClipboard = script ? formatPromptsForClipboard(script.scenes) : "";

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-5 border-b border-ink/10 pb-5 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-black text-ink">
              <Sparkles className="h-4 w-4 text-punch" aria-hidden />
              골때리는 건강 가이드 스튜디오
            </div>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-ink md:text-5xl">
              음식 캐릭터 상황극 숏츠 제작
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-ink/70">
              입력부터 주제 후보, 씬별 대본, 캐릭터 이미지까지 한 번에 만드는 제작 워크플로우입니다.
            </p>
          </div>

          <img
            src="/brand/studio-preview.svg"
            alt="음식 캐릭터 스튜디오 미리보기"
            className="hidden h-44 w-full rounded-lg border border-ink/10 object-cover shadow-crisp lg:block"
          />
        </header>

        <StepRail currentStep={step} />

        {error ? (
          <div className="rounded-lg border border-punch bg-punch/10 px-4 py-3 text-sm font-bold text-ink" role="alert">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-lg border border-ink/10 bg-white p-4 shadow-crisp">
            <form onSubmit={handleTopics} className="space-y-4">
              <label htmlFor="idea" className="block text-sm font-black text-ink">
                음식/아이디어 입력
              </label>
              <textarea
                id="idea"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                placeholder="예: 라면, 치킨, 콜라, 떡볶이, 편의점 도시락"
                className="min-h-32 w-full resize-none rounded-lg border border-ink/15 bg-paper px-4 py-3 text-base font-semibold leading-6 text-ink outline-none transition placeholder:text-ink/35 focus:border-ink focus:bg-white"
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
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 font-black text-white transition hover:bg-punch disabled:bg-ink/35"
              >
                {loading === "topics" ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <WandSparkles className="h-5 w-5" aria-hidden />
                )}
                주제 후보 생성
              </button>
            </form>

            <div className="mt-4 grid grid-cols-2 gap-2">
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

          <div className="min-w-0 space-y-5">
            <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 2</p>
                  <h2 className="text-2xl font-black text-ink">숏츠 주제 후보</h2>
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
                <div className="mt-4 grid gap-3 xl:grid-cols-2">
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
                <div className="mt-4 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-10 text-center text-sm font-bold text-ink/50">
                  주제 후보가 여기에 표시됩니다.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 3</p>
                  <h2 className="text-2xl font-black text-ink">음식 캐릭터 상황극 스크립트</h2>
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
                <div className="mt-4 space-y-4">
                  <div className="border-b border-ink/10 pb-4">
                    <h3 className="text-xl font-black text-ink">{script.title}</h3>
                    <p className="mt-1 text-sm font-bold text-punch">{script.hook}</p>
                    <p className="mt-2 text-sm font-semibold text-ink/60">총 길이: {script.totalDuration}</p>
                  </div>

                  <div className="grid gap-3">
                    {script.scenes.map((scene) => (
                      <article key={scene.sceneIndex} className="rounded-lg border border-ink/10 bg-paper p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-punch">Scene {scene.sceneIndex} · {scene.duration}</p>
                            <h4 className="text-lg font-black text-ink">{scene.sceneTitle}</h4>
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
                <div className="mt-4 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-10 text-center text-sm font-bold text-ink/50">
                  선택한 주제로 생성된 씬별 스크립트가 여기에 표시됩니다.
                </div>
              )}
            </section>

            <section className="rounded-lg border border-ink/10 bg-white p-4 shadow-crisp">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-punch">Step 4</p>
                  <h2 className="text-2xl font-black text-ink">씬별 이미지 생성 결과</h2>
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
              </div>

              {images ? (
                <div className="mt-4 space-y-4">
                  {images.scenes.map((scene) => (
                    <SceneResultCard key={scene.sceneIndex} scene={scene} />
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-ink/20 bg-paper px-4 py-10 text-center text-sm font-bold text-ink/50">
                  생성된 음식 캐릭터 이미지와 결과 카드가 여기에 표시됩니다.
                </div>
              )}

              {images ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {images.scenes.map((scene) => (
                    <a
                      key={scene.sceneIndex}
                      href={`${createAbsoluteApiUrl(scene.imageUrl)}?download=true`}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 text-sm font-bold text-ink transition hover:border-ink"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Scene {scene.sceneIndex}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
