"use client";
import { useEffect, useMemo, useState } from "react";
import { evalPoly } from "@/lib/numeric";
import { defaultParams, type ExperimentProps, type Params } from "../types";
import { fnPath, Legend, Plot, Readout, Slider, sx, sy, type Frame } from "../primitives";
import { LAMBDAS, polyFitModel, solve, truth } from "./model";

const FIT: Frame = { W: 600, H: 340, left: 50, right: 10, top: 10, bottom: 26, x0: -1.05, x1: 1.05, y0: -1.9, y1: 1.9 };
const SWEEP: Frame = { W: 600, H: 220, left: 60, right: 64, top: 12, bottom: 28, x0: 0, x1: 12, y0: -3, y1: 2 };

export default function PolyFit({ preset, hide = [], onState, readOnly, showSweep }: ExperimentProps) {
  const p = polyFitModel.presets[preset] ?? polyFitModel.presets.lab;
  const [params, setParams] = useState<Params>(() => defaultParams(polyFitModel, preset));
  const [seed, setSeed] = useState(p.seed ?? 1);
  const [showTruth, setShowTruth] = useState(preset === "lab");
  const visible = p.visibleControls ?? polyFitModel.params.map((s) => s.key);
  const isLab = !p.visibleControls;

  const { w, train, test, metrics } = useMemo(() => solve(params, seed), [params, seed]);
  const sweep = useMemo(
    () => (showSweep || isLab ? polyFitModel.sweep!(params, "degree", seed) : null),
    // sweep 与当前阶数无关，只在其他参数变化时重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showSweep, isLab, params.n, params.noise, params.lambda, seed],
  );

  useEffect(() => {
    onState?.({ params, metrics });
  }, [params, metrics, onState]);

  const set = (k: string, v: number) => setParams((old) => ({ ...old, [k]: v }));
  const show = (layer: string) => !hide.includes(layer);
  const degree = Number(params.degree);

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-ku)] border border-line bg-surface p-2">
        <Plot
          frame={FIT}
          xTicks={[-1, -0.5, 0, 0.5, 1]}
          yTicks={[-1.5, -1, -0.5, 0, 0.5, 1, 1.5]}
          label={`多项式拟合：${degree} 阶，训练误差 ${metrics.trainMSE.toFixed(3)}，测试误差 ${metrics.testMSE.toFixed(3)}`}
        >
          {showTruth && show("truth") && <path className="truth" d={fnPath(FIT, truth)} />}
          {show("model") && <path className="model" d={fnPath(FIT, (x) => evalPoly(w, x), 240)} />}
          {show("testPoints") && Array.from(test.xs, (x, i) => (
            <circle key={`t${i}`} className="pt-test" cx={sx(FIT, x)} cy={sy(FIT, test.ys[i])} r={4} />
          ))}
          {show("trainPoints") && Array.from(train.xs, (x, i) => (
            <circle key={`r${i}`} className="pt-train" cx={sx(FIT, x)} cy={sy(FIT, train.ys[i])} r={5.5} />
          ))}
        </Plot>
        <div className="px-2 pb-1 pt-1">
          <Legend items={[...(show("trainPoints") ? ["train" as const] : []), ...(show("testPoints") ? ["test" as const] : []), "model", ...(showTruth && show("truth") ? ["truth" as const] : [])]} />
        </div>
      </div>

      <div className="space-y-1">
        {visible.includes("degree") && (
          <Slider label="阶数" min={0} max={12} value={degree} onChange={(v) => set("degree", v)} disabled={readOnly} />
        )}
        {visible.includes("n") && (
          <Slider label="训练点数" min={5} max={40} value={Number(params.n)} onChange={(v) => set("n", v)} disabled={readOnly} />
        )}
        {visible.includes("noise") && (
          <Slider label="噪声" min={0} max={0.5} step={0.01} value={Number(params.noise)} display={Number(params.noise).toFixed(2)} onChange={(v) => set("noise", v)} disabled={readOnly} />
        )}
        {visible.includes("lambda") && (
          <Slider
            label="正则化 λ"
            min={0}
            max={LAMBDAS.length - 1}
            value={Math.max(0, LAMBDAS.indexOf(Number(params.lambda)))}
            display={Number(params.lambda) === 0 ? "关" : Number(params.lambda).toExponential(0)}
            onChange={(i) => set("lambda", LAMBDAS[i])}
            disabled={readOnly}
          />
        )}
      </div>

      <Readout train={metrics.trainMSE} test={show("testPoints") ? metrics.testMSE : undefined} />

      {isLab && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-lg border border-line bg-surface px-4 text-sm hover:border-primary" onClick={() => setSeed((s) => s + 1)} disabled={readOnly}>
            重新采样数据
          </button>
          <button type="button" aria-pressed={showTruth} className="min-h-11 rounded-lg border border-line bg-surface px-4 text-sm hover:border-primary" onClick={() => setShowTruth((v) => !v)}>
            {showTruth ? "隐藏真实规律" : "显示真实规律"}
          </button>
        </div>
      )}

      {sweep && (
        <div className="rounded-[var(--radius-ku)] border border-line bg-surface p-2">
          <SweepPlot sweep={sweep} degree={degree} />
          <p className="px-2 pb-1 text-xs text-muted">误差随阶数变化（纵轴取对数）。虚线是当前阶数。</p>
        </div>
      )}
    </div>
  );
}

function SweepPlot({ sweep, degree }: { sweep: { value: number; metrics: Record<string, number> }[]; degree: number }) {
  const ly = (v: number) => Math.min(SWEEP.y1, Math.max(SWEEP.y0, Math.log10(Math.max(v, 1e-3))));
  const line = (k: string) => sweep.map((p, i) => `${i ? "L" : "M"}${sx(SWEEP, p.value).toFixed(1)} ${sy(SWEEP, ly(p.metrics[k])).toFixed(1)}`).join("");
  const last = sweep[sweep.length - 1];
  return (
    <Plot
      frame={SWEEP}
      xTicks={[0, 2, 4, 6, 8, 10, 12]}
      yTicks={[-3, -2, -1, 0, 1, 2]}
      xFmt={(v) => String(v)}
      yFmt={(v) => (v === 0 ? "1" : `1e${v}`)}
      label={`误差随阶数变化。${sweep.map((p) => `${p.value} 阶：训练 ${p.metrics.trainMSE.toFixed(3)}，测试 ${p.metrics.testMSE.toFixed(3)}`).join("；")}`}
      overlay={
        <>
          <text x={SWEEP.W - SWEEP.right + 6} y={sy(SWEEP, ly(last.metrics.trainMSE)) + 4} style={{ fill: "var(--color-train)" }}>训练</text>
          <text x={SWEEP.W - SWEEP.right + 6} y={sy(SWEEP, ly(last.metrics.testMSE)) + 4} style={{ fill: "var(--color-test-text)" }}>测试</text>
        </>
      }
    >
      <line className="cursor" x1={sx(SWEEP, degree)} x2={sx(SWEEP, degree)} y1={SWEEP.top} y2={SWEEP.H - SWEEP.bottom} />
      <path className="ln-train" d={line("trainMSE")} />
      <path className="ln-test" d={line("testMSE")} />
      {sweep.map((p) => (
        <g key={p.value}>
          <circle className="dot-train" cx={sx(SWEEP, p.value)} cy={sy(SWEEP, ly(p.metrics.trainMSE))} r={p.value === degree ? 5 : 3} />
          <circle className="dot-test" cx={sx(SWEEP, p.value)} cy={sy(SWEEP, ly(p.metrics.testMSE))} r={p.value === degree ? 5 : 3} />
        </g>
      ))}
    </Plot>
  );
}
