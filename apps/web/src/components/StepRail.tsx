import { Image, Lightbulb, ScrollText, Utensils, Video } from "lucide-react";

const steps = [
  { id: 1, label: "입력", icon: Utensils },
  { id: 2, label: "주제", icon: Lightbulb },
  { id: 3, label: "대본", icon: ScrollText },
  { id: 4, label: "이미지", icon: Image },
  { id: 5, label: "영상", icon: Video }
];

type StepRailProps = {
  currentStep: number;
};

export function StepRail({ currentStep }: StepRailProps) {
  return (
    <nav className="grid grid-cols-5 gap-2" aria-label="제작 단계">
      {steps.map((step) => {
        const Icon = step.icon;
        const active = currentStep === step.id;
        const done = currentStep > step.id;

        return (
          <div
            key={step.id}
            title={step.label}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-2.5 text-xs font-bold sm:justify-start ${
              active
                ? "border-ink bg-ink text-white"
                : done
                  ? "border-mint bg-mint/15 text-ink"
                  : "border-ink/10 bg-white/80 text-ink/55"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden min-w-0 truncate sm:inline">{step.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
