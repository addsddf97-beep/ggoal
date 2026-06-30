import type { TopicCandidate } from "@food-shorts/shared";
import { CheckCircle2, Circle } from "lucide-react";

type TopicCardProps = {
  topic: TopicCandidate;
  selected: boolean;
  onSelect: () => void;
};

export function TopicCard({ topic, selected, onSelect }: TopicCardProps) {
  const Icon = selected ? CheckCircle2 : Circle;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`h-full rounded-lg border bg-white p-3 text-left shadow-crisp transition hover:-translate-y-0.5 hover:border-ink ${
        selected ? "border-ink ring-2 ring-citrus" : "border-ink/10"
      }`}
    >
      <div className="mb-3 flex items-start gap-3">
        <Icon className={`mt-1 h-5 w-5 shrink-0 ${selected ? "text-leaf" : "text-ink/35"}`} aria-hidden />
        <div className="min-w-0">
          <h3 className="text-base font-black leading-snug text-ink">{topic.title}</h3>
          <p className="mt-2 text-sm font-semibold text-punch">{topic.hook}</p>
        </div>
      </div>

      <dl className="space-y-2 text-sm text-ink/75">
        <div>
          <dt className="font-bold text-ink">캐릭터</dt>
          <dd>{topic.foodCharacter}</dd>
        </div>
        <div>
          <dt className="font-bold text-ink">영양 포인트</dt>
          <dd>{topic.nutritionPoint}</dd>
        </div>
        <div>
          <dt className="font-bold text-ink">연출</dt>
          <dd>{topic.direction}</dd>
        </div>
      </dl>

      <span className="mt-4 inline-flex rounded-md bg-mint/15 px-2.5 py-1 text-xs font-black text-ink">
        {topic.tone}
      </span>
    </button>
  );
}
