"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { experiments } from "@/experiments/registry";
import type { ExperimentState } from "@/experiments/types";
import { grade, XP_PER_CORRECT } from "@/lib/quiz";
import { writeProgress } from "@/lib/progress";
import type { Question } from "@/lib/schema";
import { t } from "@/lib/strings";

type Phase = "ask" | "right" | "wrong";

export default function Practice({ kuId, title, quiz, unlocks }: { kuId: string; title: string; quiz: Question[]; unlocks: string[] }) {
  const [step, setStep] = useState(0);
  const [xp, setXp] = useState(0);
  const [phase, setPhase] = useState<Phase>("ask");
  const [picked, setPicked] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const expState = useRef<ExperimentState | null>(null);
  const onState = useCallback((s: ExperimentState) => { expState.current = s; }, []);

  const done = step >= quiz.length;
  const q = quiz[step];

  const check = () => {
    let right: boolean;
    if (q.type === "choice") right = grade(q, { kind: "choice", picked });
    else {
      const def = experiments[q.experiment.id];
      const seed = def.presets[q.experiment.preset]?.seed ?? 1;
      right = grade(q, { kind: "experiment", state: expState.current }, def, seed);
    }
    setPhase(right ? "right" : "wrong");
    if (right) {
      const nx = xp + XP_PER_CORRECT;
      setXp(nx);
      if (step === quiz.length - 1) writeProgress(kuId, { done: true, xp: nx, lastQuiz: new Date().toISOString() });
    }
  };
  const advance = () => {
    if (phase === "right") {
      setStep((s) => s + 1);
      setPicked(null);
      expState.current = null;
    }
    setPhase("ask");
  };
  const restart = () => {
    setStep(0); setXp(0); setPhase("ask"); setPicked(null); setAttempt((a) => a + 1);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={quiz.length} aria-valuenow={step} aria-label="闯关进度">
          <div className="h-full rounded-full bg-good transition-[width] duration-300" style={{ width: `${(step / quiz.length) * 100}%` }} />
        </div>
        <span className="mono text-sm font-bold text-accent">{t.xp(xp)}</span>
      </div>

      {done ? (
        <div className="space-y-3 rounded-[var(--radius-ku)] border border-line bg-surface p-8 text-center">
          <div className="mono text-4xl font-bold text-good">+{xp} XP</div>
          <h2 className="text-2xl font-bold">{t.doneTitle(title)}</h2>
          {unlocks.length > 0 && <p className="text-muted">{t.unlockNext(unlocks)}</p>}
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button type="button" onClick={restart} className="min-h-11 rounded-xl border border-line px-5">{t.practiceAgain}</button>
            <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 font-bold text-surface no-underline">{t.navMap}</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted">{t.questionOf(step + 1, quiz.length)}</p>
          <h2 className="font-sans text-xl font-bold leading-relaxed">{q.prompt}</h2>

          {q.type === "experiment-target" ? (
            <ExperimentQ key={`${q.id}-${attempt}`} q={q} onState={onState} readOnly={phase !== "ask"} />
          ) : (
            <div className="grid gap-2.5" role="radiogroup" aria-label={q.prompt}>
              {q.options.map((o, i) => {
                const sel = picked === i;
                const showRight = phase !== "ask" && sel && phase === "right";
                const showWrong = phase !== "ask" && sel && phase === "wrong";
                return (
                  <button key={i} type="button" role="radio" aria-checked={sel} disabled={phase !== "ask"} onClick={() => setPicked(i)}
                    className={[
                      "flex min-h-13 items-center justify-between rounded-xl border-2 px-4 py-3 text-left text-base",
                      showRight ? "border-good bg-good-soft" : showWrong ? "border-bad bg-bad-soft" : sel ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent",
                    ].join(" ")}>
                    <span>{o}</span>
                    {showRight && <span aria-hidden className="text-good">✓</span>}
                    {showWrong && <span aria-hidden className="text-bad">✕</span>}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            {phase === "ask" ? (
              <button type="button" onClick={check} disabled={q.type === "choice" && picked === null}
                className="min-h-12 w-full rounded-xl bg-accent font-bold text-surface disabled:opacity-40">
                {t.check}
              </button>
            ) : (
              <div role="status" className={`space-y-3 rounded-xl p-4 ${phase === "right" ? "bg-good-soft" : "bg-bad-soft"}`}>
                <p className={`font-bold ${phase === "right" ? "text-good" : "text-bad"}`}>
                  {phase === "right" ? `✓ ${t.correct} +${XP_PER_CORRECT} XP` : `✕ ${t.wrong}`}
                </p>
                <p className="text-sm">{phase === "right" ? q.explain : q.hint ? `${t.hintPrefix}${q.hint}` : ""}</p>
                <button type="button" onClick={advance} autoFocus
                  className={`min-h-12 w-full rounded-xl font-bold text-surface ${phase === "right" ? "bg-good" : "bg-bad"}`}>
                  {phase === "right" ? t.continue : t.retry}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ExperimentQ({ q, onState, readOnly }: { q: Extract<Question, { type: "experiment-target" }>; onState: (s: ExperimentState) => void; readOnly: boolean }) {
  const def = experiments[q.experiment.id];
  if (!def) return <p className="text-bad">实验「{q.experiment.id}」不存在</p>;
  const C = def.Component;
  return <C preset={q.experiment.preset} hide={q.experiment.hide} onState={onState} readOnly={readOnly} />;
}
