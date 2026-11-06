"use client";
import { setStill, useStill } from "@/lib/still";
import { t } from "@/lib/strings";

export default function StillToggle() {
  const still = useStill();
  return (
    <button type="button" onClick={() => setStill(!still)} aria-pressed={still}
      className="min-h-9 whitespace-nowrap rounded-full border border-line px-2.5 text-xs text-muted hover:text-ink" title={t.stillHint}>
      {still ? t.stillOn : t.stillOff}
    </button>
  );
}
