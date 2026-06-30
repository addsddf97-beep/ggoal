"use client";

import type { SceneImage } from "@food-shorts/shared";
import { Download } from "lucide-react";
import { createAbsoluteApiUrl } from "@/lib/api";
import { CopyButton } from "@/components/CopyButton";

type SceneResultCardProps = {
  scene: SceneImage;
};

export function SceneResultCard({ scene }: SceneResultCardProps) {
  const imageUrl = scene.imageDataUrl ?? createAbsoluteApiUrl(scene.imageUrl);
  const downloadUrl = scene.imageDataUrl ?? `${imageUrl}?download=true`;
  const copyValue = [
    `Scene ${scene.sceneIndex}. ${scene.sceneTitle}`,
    `대사: ${scene.dialogue}`,
    `자막: ${scene.subtitle}`,
    `화면 연출: ${scene.visualDirection}`,
    `영양 포인트: ${scene.nutritionPoint}`,
    `균형 메모: ${scene.healthBalanceNote}`,
    `이미지 프롬프트: ${scene.imagePrompt}`
  ].join("\n");

  return (
    <article className="grid gap-5 rounded-lg border border-ink/10 bg-white p-4 shadow-crisp lg:grid-cols-[260px_1fr]">
      <div className="overflow-hidden rounded-lg border border-ink/10 bg-paper">
        <img src={imageUrl} alt={`${scene.sceneTitle} 이미지`} className="aspect-[2/3] w-full object-cover" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-punch">Scene {scene.sceneIndex}</p>
            <h3 className="text-xl font-black leading-tight text-ink">{scene.sceneTitle}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <CopyButton label="씬 복사" value={copyValue} compact />
            <a
              href={downloadUrl}
              download={`scene-${scene.sceneIndex}.png`}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-ink/15 bg-ink px-3 text-sm font-semibold text-white transition hover:bg-punch"
              title="이미지 다운로드"
            >
              <Download className="h-4 w-4" aria-hidden />
              이미지
            </a>
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm text-ink/75 md:grid-cols-2">
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
            <dt className="font-bold text-ink">영양 포인트</dt>
            <dd>{scene.nutritionPoint}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="font-bold text-ink">균형 메모</dt>
            <dd>{scene.healthBalanceNote}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="font-bold text-ink">이미지 프롬프트</dt>
            <dd className="break-words font-mono text-xs leading-relaxed text-ink/70">{scene.imagePrompt}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
