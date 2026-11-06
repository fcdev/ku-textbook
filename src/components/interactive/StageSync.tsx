"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { setChannelParams, useChannelLocked, useExperimentParams } from "@/experiments/channel";
import { experimentModels } from "@/experiments/models";
import { parseSet } from "@/lib/interactive";
import { t } from "@/lib/strings";

/**
 * 滚动联动的分段说明：段落滚到屏幕中间时，把实验切到这一段描述的状态（scrollytelling）。
 * 也可以点“在图上看”手动切换（键盘、读屏和手机都能用）。
 */
export default function StageSync({ label, ch, exp, preset = "article", set, children }: { label: string; ch: string; exp: string; preset?: string; set: string; children: ReactNode }) {
  const model = experimentModels[exp];
  const [params] = useExperimentParams(model, preset, ch);
  const locked = useChannelLocked(ch, model, preset);
  const ref = useRef<HTMLDivElement>(null);
  const [target] = useState(() => parseSet(set));
  const active = Object.entries(target).every(([k, v]) => params[k] === v);

  const apply = () => { if (model && !locked) setChannelParams(ch, model, preset, (o) => ({ ...o, ...target })); };
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    const el = ref.current;
    // 只在桌面（实验粘在右栏、始终可见）时随滚动切换；手机上实验不在视野里，改成点按钮
    if (!el || !window.matchMedia("(min-width: 1024px)").matches || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && applyRef.current()), { rootMargin: "-45% 0px -50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-active={active ? "1" : undefined}
      className="stage-sync grid gap-1 sm:grid-cols-[5.5em_1fr_auto] sm:items-center sm:gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[15px]">
      <b className="mono text-sm text-ink">{label}</b>
      <span>{children}</span>
      <button type="button" onClick={apply} disabled={locked} aria-pressed={active}
        className={`justify-self-start min-h-9 whitespace-nowrap rounded-full border px-3 text-xs disabled:opacity-40 ${active ? "border-ink bg-accent text-on-accent" : "border-line text-muted hover:border-primary hover:text-ink"}`}>
        {active ? "✓ " : "▶ "}{t.stageShow}
      </button>
    </div>
  );
}
