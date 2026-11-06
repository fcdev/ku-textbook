"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { contourSegments, quantileLevels, sampleGrid } from "@/lib/contour";
import { formatError } from "@/lib/numeric";
import { useStill } from "@/lib/still";
import { useExperimentParams } from "../channel";
import { Btn, Metric, Slider, sx, sy, type Frame } from "../primitives";
import type { ExperimentProps } from "../types";
import { descent2dModel, LRS_2D, MAX_STEPS_2D, MOMENTA, solveDescent2d, SURFACES } from "./model";

const Surface3D = dynamic(() => import("./Surface3D"), {
  ssr: false,
  loading: () => <div className="grid aspect-[1/0.62] place-items-center text-sm text-muted">正在加载 3D 视图…</div>,
});

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Descent2D({ preset, channel, hide = [], onState, readOnly }: ExperimentProps) {
  const p = descent2dModel.presets[preset] ?? descent2dModel.presets.lab;
  const [params, setParams] = useExperimentParams(descent2dModel, preset, channel);
  const isLab = !p.visibleControls;
  const visible = p.visibleControls ?? descent2dModel.params.map((s) => s.key);
  const { pts, metrics } = useMemo(() => solveDescent2d(params), [params]);
  useEffect(() => { onState?.({ params, metrics }); }, [params, metrics, onState]);

  const [view, setView] = useState<"3d" | "2d" | null>(null);
  const [gl, setGl] = useState(false);
  useEffect(() => { const ok = hasWebGL(); setGl(ok); setView(ok ? "3d" : "2d"); }, []);

  const still = useStill();
  const [playing, setPlaying] = useState(false);
  const steps = Number(params.steps);
  const stop = metrics.diverged === 1 || steps >= MAX_STEPS_2D;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!playing) return;
    if (still) { setParams((o) => ({ ...o, steps: MAX_STEPS_2D })); setPlaying(false); return; }
    timer.current = setInterval(() => setParams((o) => ({ ...o, steps: Math.min(MAX_STEPS_2D, Number(o.steps) + 1) })), 260);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, still, setParams]);
  useEffect(() => { if (stop && playing) setPlaying(false); }, [stop, playing]);
  useEffect(() => { if (readOnly) setPlaying(false); }, [readOnly]);

  const surface = Number(params.surface);
  const S = SURFACES[surface] ?? SURFACES[0];
  const canPick = !readOnly && (isLab || visible.includes("x0"));
  const pick = (x: number, y: number) => {
    const r = (v: number) => Math.round(Math.max(-3, Math.min(3, v)) * 10) / 10;
    setPlaying(false);
    setParams((o) => ({ ...o, x0: r(x), y0: r(y), steps: 0 }));
  };
  const setReset = (patch: Record<string, number>) => { setPlaying(false); setParams((o) => ({ ...o, ...patch, steps: 0 })); };
  const [cx, cy] = pts[pts.length - 1];
  const out = cx < S.box[0] || cx > S.box[1] || cy < S.box[2] || cy > S.box[3];
  const showTrail = !hide.includes("trail");
  const label = `${S.name}损失曲面。起点 (${Number(params.x0).toFixed(1)}, ${Number(params.y0).toFixed(1)})，学习率 ${params.lr}，第 ${steps} 步，损失 ${formatError(metrics.loss)}${metrics.diverged ? "，已发散" : ""}`;

  return (
    <div className="space-y-3">
      <div className="rounded-[var(--radius-ku)] border border-line bg-surface p-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
          <div className="inline-flex rounded-full border border-line p-0.5 text-xs" role="group" aria-label="视图">
            {gl && <button type="button" aria-pressed={view === "3d"} onClick={() => setView("3d")} className={`min-h-8 rounded-full px-3 ${view === "3d" ? "bg-primary font-bold text-on-primary" : "text-muted"}`}>3D 曲面</button>}
            <button type="button" aria-pressed={view === "2d"} onClick={() => setView("2d")} className={`min-h-8 rounded-full px-3 ${view === "2d" ? "bg-primary font-bold text-on-primary" : "text-muted"}`}>等高线</button>
          </div>
          <span className="text-xs text-muted">{view === "3d" ? "拖动旋转视角" : ""}{canPick ? `${view === "3d" ? "，" : ""}点一下设起点` : ""}</span>
        </div>
        {view === "3d" ? (
          <Surface3D surface={surface} pts={pts} showTrail={showTrail} still={still} onPick={canPick ? pick : undefined} label={label} />
        ) : view === "2d" ? (
          <ContourView surface={surface} pts={pts} showTrail={showTrail} onPick={canPick ? pick : undefined} label={label} />
        ) : (
          <div className="aspect-[1/0.62]" />
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 pt-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-full border-2 border-model bg-accent" />当前参数 (x, y)</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 bg-model" />走过的路</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-full border-2 border-good" />谷底</span>
        </div>
      </div>
      {(out || metrics.diverged === 1) && <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">小球飞出了曲面：学习率太大，在陡的方向上越跳越远，这就是<b>发散</b>。</p>}

      {isLab && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="地形">
          {SURFACES.map((s, i) => (
            <Btn key={s.name} pressed={surface === i} onClick={() => setReset({ surface: i, x0: s.start[0], y0: s.start[1] })} disabled={readOnly}>{s.name}</Btn>
          ))}
        </div>
      )}
      <div className="space-y-1">
        {visible.includes("lr") && (
          <Slider label="学习率 η" min={0} max={LRS_2D.length - 1} value={Math.max(0, LRS_2D.indexOf(Number(params.lr)))} display={String(params.lr)}
            onChange={(i) => setReset({ lr: LRS_2D[i] })} disabled={readOnly} />
        )}
        {visible.includes("momentum") && (
          <Slider label="动量" min={0} max={MOMENTA.length - 1} value={Math.max(0, MOMENTA.indexOf(Number(params.momentum)))} display={Number(params.momentum) === 0 ? "关" : String(params.momentum)}
            onChange={(i) => setReset({ momentum: MOMENTA[i] })} disabled={readOnly} />
        )}
        {visible.includes("x0") && (
          <Slider label="起点 x" min={-3} max={3} step={0.1} value={Number(params.x0)} display={Number(params.x0).toFixed(1)} onChange={(v) => setReset({ x0: v })} disabled={readOnly} />
        )}
        {visible.includes("y0") && (
          <Slider label="起点 y" min={-3} max={3} step={0.1} value={Number(params.y0)} display={Number(params.y0).toFixed(1)} onChange={(v) => setReset({ y0: v })} disabled={readOnly} />
        )}
      </div>
      {visible.includes("steps") && (
        <div className="flex flex-wrap gap-2">
          <Btn primary onClick={() => setParams((o) => ({ ...o, steps: Math.min(MAX_STEPS_2D, Number(o.steps) + 1) }))} disabled={readOnly || stop || playing}>走一步</Btn>
          <Btn pressed={playing} onClick={() => setPlaying((v) => !v)} disabled={readOnly || stop}>{playing ? "暂停" : "自动播放"}</Btn>
          <Btn onClick={() => { setPlaying(false); setParams((o) => ({ ...o, steps: 0 })); }} disabled={readOnly}>回到起点</Btn>
        </div>
      )}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-live="polite">
        <Metric label="步数" value={String(steps)} />
        <Metric label="损失" value={formatError(metrics.loss)} tone={metrics.diverged ? "bad" : "model"} />
        {surface === 1 && metrics.valley >= 0 && <Metric label="终点" value={metrics.valley === 0 ? "左边深谷" : "右边浅谷"} tone={metrics.valley === 0 ? "good" : "test"} />}
      </div>
    </div>
  );
}

function ContourView({ surface, pts, showTrail, onPick, label }: { surface: number; pts: [number, number][]; showTrail: boolean; onPick?: (x: number, y: number) => void; label: string }) {
  const S = SURFACES[surface] ?? SURFACES[0];
  const [x0, x1, y0, y1] = S.box;
  const F: Frame = { W: 520, H: 380, left: 34, right: 10, top: 10, bottom: 26, x0, x1, y0, y1 };
  const { lines, cells } = useMemo(() => {
    const f = (x: number, y: number) => Math.log1p(S.loss(x, y));
    const g = sampleGrid(f, S.box, 56);
    const levels = quantileLevels(g.grid, 12);
    const lines = levels.map((lv) => contourSegments(g.grid, g.xs, g.ys, lv));
    const c = sampleGrid(f, S.box, 26);
    const max = Math.max(...c.grid.flat());
    return { lines, cells: { ...c, max } };
  }, [S]);
  const ref = useRef<SVGSVGElement>(null);
  const click = (e: React.MouseEvent) => {
    const m = ref.current?.getScreenCTM();
    if (!m || !onPick) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    onPick(x0 + ((p.x - F.left) / (F.W - F.left - F.right)) * (x1 - x0), y1 - ((p.y - F.top) / (F.H - F.top - F.bottom)) * (y1 - y0));
  };
  const cw = (F.W - F.left - F.right) / (cells.xs.length - 1), ch = (F.H - F.top - F.bottom) / (cells.ys.length - 1);
  const clip = (v: number, a: number, b: number) => Math.max(a - 1, Math.min(b + 1, v));
  const trail = pts.map(([x, y]) => `${sx(F, clip(x, x0, x1)).toFixed(1)},${sy(F, clip(y, y0, y1)).toFixed(1)}`).join(" ");
  const [cx, cy] = pts[pts.length - 1];
  return (
    <svg ref={ref} className="plot" viewBox={`0 0 ${F.W} ${F.H}`} role="img" aria-label={label} onClick={click} style={{ cursor: onPick ? "crosshair" : undefined }}>
      {cells.grid.map((row, j) => row.map((v, i) => (
        <rect key={`${i}-${j}`} x={sx(F, cells.xs[i]) - cw / 2} y={sy(F, cells.ys[j]) - ch / 2} width={cw + 0.5} height={ch + 0.5}
          fill="var(--color-test)" opacity={0.03 + 0.32 * (v / cells.max)} />
      )))}
      {lines.map((segs, k) => (
        <path key={k} d={segs.map(([a, b, c, d]) => `M${sx(F, a).toFixed(1)} ${sy(F, b).toFixed(1)}L${sx(F, c).toFixed(1)} ${sy(F, d).toFixed(1)}`).join("")}
          fill="none" stroke="var(--color-ink)" strokeWidth={k === 0 ? 1.4 : 0.8} opacity={0.5} />
      ))}
      {S.minima.map(([mx, my], i) => <circle key={i} cx={sx(F, mx)} cy={sy(F, my)} r={8} fill="none" stroke="var(--color-good)" strokeWidth={2.5} />)}
      {showTrail && <polyline points={trail} fill="none" stroke="var(--color-model)" strokeWidth={2} strokeLinejoin="round" />}
      {showTrail && pts.slice(0, -1).map(([x, y], i) => <circle key={i} cx={sx(F, clip(x, x0, x1))} cy={sy(F, clip(y, y0, y1))} r={2.5} fill="var(--color-model)" />)}
      {cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 && <circle cx={sx(F, cx)} cy={sy(F, cy)} r={9} fill="var(--color-accent)" stroke="var(--color-model)" strokeWidth={2.5} />}
      <text x={F.W - F.right} y={F.H - 6} textAnchor="end">x →</text>
      <text x={4} y={F.top + 12}>y</text>
    </svg>
  );
}
