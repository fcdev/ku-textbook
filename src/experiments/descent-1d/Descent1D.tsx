"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatError } from "@/lib/numeric";
import { type ExperimentProps } from "../types";
import { useExperimentParams } from "../channel";
import { useStill } from "@/lib/still";
import { Btn, fnPath, Metric, Plot, Slider, sx, sy, type Frame } from "../primitives";
import { descent1dModel, loss, LRS, MAX_STEPS, solveDescent, W_STAR } from "./model";

const F: Frame = { W: 600, H: 320, left: 50, right: 10, top: 10, bottom: 26, x0: -2.5, x1: 4.5, y0: -0.5, y1: 12.5 };
const clampW = (w: number) => Math.max(F.x0 - 1, Math.min(F.x1 + 1, w));

export default function Descent1D({ preset, channel, hide = [], onState, readOnly }: ExperimentProps) {
  const p = descent1dModel.presets[preset] ?? descent1dModel.presets.lab;
  const [params, setParams] = useExperimentParams(descent1dModel, preset, channel);
  const [playing, setPlaying] = useState(false);
  const isLab = !p.visibleControls;
  const visible = p.visibleControls ?? descent1dModel.params.map((s) => s.key);
  const { ws, metrics } = useMemo(() => solveDescent(params), [params]);
  useEffect(() => { onState?.({ params, metrics }); }, [params, metrics, onState]);

  const steps = Number(params.steps);
  const set = (k: string, v: number) => setParams((o) => ({ ...o, [k]: v }));
  const stop = metrics.diverged === 1 || steps >= MAX_STEPS;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const still = useStill();
  useEffect(() => {
    if (!playing) return;
    // 静止模式：不做逐步动画，直接跳到 60 步后的结果
    if (still) { setParams((o) => ({ ...o, steps: MAX_STEPS })); setPlaying(false); return; }
    timer.current = setInterval(() => setParams((o) => ({ ...o, steps: Math.min(MAX_STEPS, Number(o.steps) + 1) })), 350);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, still, setParams]);
  useEffect(() => { if (stop && playing) setPlaying(false); }, [stop, playing]);
  useEffect(() => { if (readOnly) setPlaying(false); }, [readOnly]);

  const w = ws[ws.length - 1];
  const lr = Number(params.lr);
  const show = (l: string) => !hide.includes(l);
  const g = 2 * (w - W_STAR);
  const out = w < F.x0 || w > F.x1;

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-ku)] border border-line bg-surface p-2">
        <Plot frame={F} xTicks={[-2, -1, 0, 1, 2, 3, 4]} yTicks={[0, 2, 4, 6, 8, 10, 12]} xFmt={(v) => String(v)} yFmt={(v) => String(v)}
          label={`损失曲线 L(w) = (w−1)²。学习率 ${lr}，第 ${steps} 步，w = ${w.toFixed(3)}，损失 ${loss(w).toFixed(3)}`}>
          <path className="truth" style={{ strokeDasharray: "none", stroke: "var(--color-ink)", opacity: 0.55 }} d={fnPath(F, loss)} />
          <line x1={sx(F, W_STAR)} x2={sx(F, W_STAR)} y1={sy(F, 0)} y2={F.H - F.bottom} stroke="var(--color-good)" strokeDasharray="4 4" />
          {show("trail") && ws.slice(0, -1).map((a, i) => {
            const bW = ws[i + 1];
            return <line key={i} x1={sx(F, clampW(a))} y1={sy(F, Math.min(loss(clampW(a)), 40))} x2={sx(F, clampW(bW))} y2={sy(F, Math.min(loss(clampW(bW)), 40))} stroke="var(--color-model)" strokeWidth={1.5} opacity={0.45} markerEnd="" />;
          })}
          {show("trail") && ws.slice(0, -1).map((a, i) => <circle key={`t${i}`} cx={sx(F, clampW(a))} cy={sy(F, Math.min(loss(clampW(a)), 40))} r={3.5} fill="var(--color-model)" opacity={0.3} />)}
          {show("tangent") && !out && (
            <line x1={sx(F, w - 0.8)} x2={sx(F, w + 0.8)} y1={sy(F, loss(w) - 0.8 * g)} y2={sy(F, loss(w) + 0.8 * g)} stroke="var(--color-test)" strokeWidth={2} />
          )}
          {!out && <circle cx={sx(F, w)} cy={sy(F, loss(w))} r={9} fill="var(--color-accent)" stroke="var(--color-model)" strokeWidth={2.5} />}
        </Plot>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 pt-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-full border-2 border-model bg-accent" />当前参数 w</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 bg-test" />切线（坡度 = 梯度）</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 border-l-2 border-dashed border-good" />最低点</span>
        </div>
      </div>
      {out && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">小球已经飞出画面：学习率太大，损失越来越大，这叫<b>发散</b>。</p>}
      <div className="space-y-1">
        {visible.includes("lr") && (
          <Slider label="学习率 η" min={0} max={LRS.length - 1} value={Math.max(0, LRS.indexOf(lr))} display={String(lr)}
            onChange={(i) => setParams((o) => ({ ...o, lr: LRS[i], steps: 0 }))} disabled={readOnly} />
        )}
        {visible.includes("w0") && (
          <Slider label="起点 w₀" min={-2} max={4} step={0.1} value={Number(params.w0)} display={Number(params.w0).toFixed(1)}
            onChange={(v) => setParams((o) => ({ ...o, w0: v, steps: 0 }))} disabled={readOnly} />
        )}
      </div>
      {visible.includes("steps") && (
        <div className="flex flex-wrap gap-2">
          <Btn primary onClick={() => set("steps", Math.min(MAX_STEPS, steps + 1))} disabled={readOnly || stop || playing}>走一步</Btn>
          <Btn pressed={playing} onClick={() => setPlaying((v) => !v)} disabled={readOnly || stop}>{playing ? "暂停" : "自动播放"}</Btn>
          <Btn onClick={() => { setPlaying(false); set("steps", 0); }} disabled={readOnly}>回到起点</Btn>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-live="polite">
        <Metric label="步数" value={String(steps)} />
        <Metric label="w" value={Math.abs(w) > 999 ? (w > 0 ? "+∞" : "−∞") : w.toFixed(3)} tone="model" />
        <Metric label="损失" value={formatError(loss(w))} tone={metrics.diverged ? "bad" : "model"} />
        {(isLab || visible.includes("lr")) && <Metric label="梯度" value={Math.abs(g) > 999 ? "∞" : g.toFixed(2)} tone="test" />}
      </div>
    </div>
  );
}
