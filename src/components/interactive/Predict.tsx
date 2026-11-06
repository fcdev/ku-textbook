"use client";
import { useEffect, useId, useState, type ReactNode } from "react";
import { setChannelLock } from "@/experiments/channel";
import { experimentModels } from "@/experiments/models";
import { parseOptions } from "@/lib/interactive";
import { readPredictions, writePrediction } from "@/lib/predictions";
import { t } from "@/lib/strings";

/**
 * 预测门槛：先选一个预测，才能动手做实验（gate）、才能掀开解释（flap）。
 * 学生先押注再验证，比直接看答案记得牢（预测-验证-解释）。
 */
export default function Predict({ id, ch, exp, preset = "article", gate, question, options, answer, children }: {
  id: string; ch?: string; exp?: string; preset?: string; gate?: boolean | string; question: string; options: string; answer?: string; children?: ReactNode;
}) {
  const opts = parseOptions(options);
  const ans = answer === undefined ? undefined : Number(answer);
  const model = exp ? experimentModels[exp] : undefined;
  const gated = gate !== undefined && gate !== false && gate !== "false" && !!ch && !!model;
  const [key, setKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const flapId = useId();

  useEffect(() => {
    const k = `${location.pathname.replace(/\/$/, "")}#${id}`;
    setKey(k);
    const r = readPredictions()[k];
    if (r) { setPicked(r.picked); setOpen(r.revealed); }
  }, [id]);

  // 还没预测时锁住同一通道的实验；key 读出来之前（首帧）也先锁着，避免学生抢先拖动
  useEffect(() => {
    if (!gated) return;
    setChannelLock(ch!, model!, preset, id, picked === null);
    return () => setChannelLock(ch!, model!, preset, id, false);
  }, [gated, ch, model, preset, id, picked]);

  const save = (p: number | null, revealed: boolean) => {
    if (key) writePrediction(key, p === null ? null : { picked: p, revealed, at: new Date().toISOString() });
  };
  const pick = (i: number) => { setPicked(i); save(i, open); };
  const reveal = () => { if (picked === null) return; setOpen(true); save(picked, true); };
  const reset = () => { setPicked(null); setOpen(false); save(null, false); };

  const right = ans !== undefined && picked === ans;
  return (
    <section className="space-y-3 rounded-[var(--radius-ku)] border-2 border-ink bg-surface p-4 shadow-[var(--shadow-card)]" aria-label={`${t.predictTitle}：${question}`}>
      <div className="flex items-center gap-2">
        <span className="mono rounded bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">{t.predictTitle}</span>
        {gated && picked === null && <span className="text-xs text-muted">🔒 实验已锁住</span>}
      </div>
      <p className="font-bold leading-relaxed">{question}</p>
      <div className="grid gap-2" role="radiogroup" aria-label={question}>
        {opts.map((o, i) => {
          const sel = picked === i;
          const mark = open && ans !== undefined ? (i === ans ? "right" : sel ? "wrong" : null) : null;
          return (
            <button key={i} type="button" role="radio" aria-checked={sel} disabled={open} onClick={() => pick(i)}
              className={[
                "flex min-h-11 items-center gap-3 rounded-lg border-2 px-3 py-2 text-left text-[15px]",
                mark === "right" ? "border-good bg-good-soft" : mark === "wrong" ? "border-bad bg-bad-soft" : sel ? "border-ink bg-accent-soft" : "border-line hover:border-primary",
              ].join(" ")}>
              <span aria-hidden className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${sel ? "border-ink bg-ink text-surface" : "border-line-strong"}`}>{sel ? "✓" : ""}</span>
              <span className="flex-1">{o}</span>
              {mark === "right" && <span className="text-good">✓</span>}
              {mark === "wrong" && <span className="text-bad">✕</span>}
            </button>
          );
        })}
      </div>
      {picked !== null && !open && <p className="text-sm text-muted" role="status">{t.predictSaved}</p>}

      {children && (
        <div className="space-y-2">
          {!open ? (
            <button type="button" onClick={reveal} disabled={picked === null} aria-expanded={false} aria-controls={flapId}
              title={picked === null ? t.predictNeedPick : undefined}
              className="flex min-h-11 w-full items-center justify-between rounded-lg border border-dashed border-line-strong bg-surface-2 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
              <span>{picked === null ? t.predictNeedPick : t.predictReveal}</span>
              <span aria-hidden>⤵</span>
            </button>
          ) : (
            <div id={flapId} className="flap space-y-2 rounded-lg border-l-4 border-accent bg-accent-soft px-4 py-3" data-open="1" role="region" aria-label={t.predictReveal}>
              {ans !== undefined && (
                <p className={`font-bold ${right ? "text-good" : "text-bad"}`}>{right ? t.predictRight : t.predictWrong(opts[ans])}</p>
              )}
              <div className="ku-prose text-[15px]">{children}</div>
            </div>
          )}
        </div>
      )}
      {picked !== null && (
        <button type="button" onClick={reset} className="text-xs text-muted underline hover:text-ink">{t.predictChange}</button>
      )}
    </section>
  );
}
