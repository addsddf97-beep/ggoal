"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type CopyButtonProps = {
  label: string;
  value: string;
  compact?: boolean;
};

export function CopyButton({ label, value, compact }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center justify-center gap-2 rounded-md border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-ink hover:bg-citrus/20 ${
        compact ? "h-9" : ""
      }`}
      title={label}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span>{copied ? "복사됨" : label}</span>
    </button>
  );
}
