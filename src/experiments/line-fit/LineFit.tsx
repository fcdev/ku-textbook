"use client";
import { useEffect, useMemo, useState } from "react";
import { formatError } from "@/lib/numeric";
import { type ExperimentProps } from "../types";
import { useExperimentParams } from "../channel";
import { Btn, Legend, Metric, Plot, Slider, sx, sy, type Frame } from "../primitives";
import { lineFitModel, solveLine } from "./model";

const F: Frame = { W: 600, H: 340, left: 50, right: 10, top: 10, bottom: 26, x0: -1.1, x1: 1.1, y0: -1.5, y1: 1.5 };
const snap = (v: number) => Math.round(v / 0.05) * 0.05;

export default function LineFit({ preset, channel, hide = [], onState, readOnly }: ExperimentProps) {
  const p = lineFitModel.presets[preset] ?? lineFitModel.presets.lab;
  const [params, setParams] = useExperimentParams(lineFitModel, preset, channel);
  const [seed, setSeed] = useState(p.seed ?? 1);
  const [showBest, setShowBest] = useState(false);
  const isLab = !p.visibleControls;
  const visible = p.visibleControls ?? lineFitModel.params.map((s) => s.key);
  const { data, best, metrics } = useMemo(() => solveLine(params, seed), [params, seed]);
  useEffect(() => { onState?.({ params, metrics }); }, [params, metrics, onState]);

  const set = (k: string, v: number | boolean) => setParams((o) => ({ ...o, [k]: v }));
  const show = (l: string) => !hide.includes(l);
  const k = Number(params.slope), b = Number(params.intercept);
  const squares = !!params.squares && show("squares");
  const pxPerY = (F.H - F.top - F.bottom) / (F.y1 - F.y0);

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-ku)] border border-line bg-surface p-2">
        <Plot frame={F} xTicks={[-1, -0.5, 0, 0.5, 1]} yTicks={[-1, -0.5, 0, 0.5, 1]}
          label={`直线 y = ${k.toFixed(2)}x + ${b.toFixed(2)}，均方误差 ${metrics.mse.toFixed(3)}`}>
          {squares && Array.from(data.xs, (x, i) => {
            const e = k * x + b - data.ys[i];
            const s = Math.abs(e) * pxPerY;
            const X = sx(F, x), Y = sy(F, Math.max(data.ys[i], k * x + b));
            return <rect key={`s${i}`} x={X} y={Y} width={s} height={s} fill="var(--color-bad)" opacity={0.14} stroke="var(--color-bad)" strokeOpacity={0.5} />;
          })}
          {show("residuals") && Array.from(data.xs, (x, i) => (
            <line key={`r${i}`} x1={sx(F, x)} x2={sx(F, x)} y1={sy(F, data.ys[i])} y2={sy(F, k * x + b)} stroke="var(--color-bad)" strokeWidth={1.5} strokeDasharray="3 2" />
          ))}
          {(showBest && show("best")) && <line className="truth" x1={sx(F, F.x0)} x2={sx(F, F.x1)} y1={sy(F, best.slope * F.x0 + best.intercept)} y2={sy(F, best.slope * F.x1 + best.intercept)} />}
          <line className="model" x1={sx(F, F.x0)} x2={sx(F, F.x1)} y1={sy(F, k * F.x0 + b)} y2={sy(F, k * F.x1 + b)} />
          {show("points") && Array.from(data.xs, (x, i) => <circle key={`p${i}`} className="pt-train" cx={sx(F, x)} cy={sy(F, data.ys[i])} r={5.5} />)}
        </Plot>
        <div className="flex flex-wrap items-center gap-x-4 px-2 pb-1 pt-1">
          <Legend items={["train", "model", ...(showBest ? ["truth" as const] : [])]} />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted"><i className="inline-block h-3 border-l-2 border-dashed border-bad" />残差</span>
        </div>
      </div>
      <p className="mono text-center text-sm">y = <span className="font-bold">{k.toFixed(2)}</span>·x {b >= 0 ? "+" : "−"} <span className="font-bold">{Math.abs(b).toFixed(2)}</span></p>
      <div className="space-y-1">
        {visible.includes("slope") && <Slider label="斜率 k" min={-2} max={2} step={0.05} value={k} display={k.toFixed(2)} onChange={(v) => set("slope", v)} disabled={readOnly} />}
        {visible.includes("intercept") && <Slider label="截距 b" min={-1.5} max={1.5} step={0.05} value={b} display={b.toFixed(2)} onChange={(v) => set("intercept", v)} disabled={readOnly} />}
        {visible.includes("n") && <Slider label="数据点数" min={3} max={30} value={Number(params.n)} onChange={(v) => set("n", v)} disabled={readOnly} />}
        {visible.includes("noise") && <Slider label="噪声" min={0} max={0.5} step={0.01} value={Number(params.noise)} display={Number(params.noise).toFixed(2)} onChange={(v) => set("noise", v)} disabled={readOnly} />}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-live="polite">
        <Metric label="均方误差" value={formatError(metrics.mse)} tone="model" />
        {isLab && <Metric label="平均绝对误差" value={formatError(metrics.mae)} />}
        {(isLab || showBest) && <Metric label="最优可达" value={formatError(metrics.bestMSE)} tone="good" />}
      </div>
      {isLab && (
        <div className="flex flex-wrap gap-2">
          <Btn primary onClick={() => setParams((o) => ({ ...o, slope: snap(best.slope), intercept: snap(best.intercept) }))} disabled={readOnly}>自动拟合（最小二乘）</Btn>
          <Btn pressed={showBest} onClick={() => setShowBest((v) => !v)}>{showBest ? "隐藏最优直线" : "显示最优直线"}</Btn>
          <Btn pressed={!!params.squares} onClick={() => set("squares", !params.squares)}>{params.squares ? "隐藏误差平方" : "画出误差平方"}</Btn>
          <Btn onClick={() => setSeed((s) => s + 1)} disabled={readOnly}>重新采样数据</Btn>
        </div>
      )}
    </div>
  );
}
