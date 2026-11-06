"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { experimentModels } from "@/experiments/models";
import { Plot, sx, sy, type Frame } from "@/experiments/primitives";
import { defaultParams } from "@/experiments/types";
import { coverage, fillGuess, scoreDrawing } from "@/lib/drawit";
import { formatParam } from "./Knob";
import { t } from "@/lib/strings";

/**
 * 画出你的预测（NYT “You Draw It” 的做法）：学生先在坐标纸上画出自己以为的曲线，再揭晓真实曲线并打分。
 * 曲线来自实验模型的 sweep，所以和实验沙盒里看到的完全一致。
 */
export default function DrawIt({ id, exp, preset = "lab", over, metric, also, log, question, xlabel, ylabel, children }: {
  id: string; exp: string; preset?: string; over: string; metric: string; also?: string; log?: boolean | string;
  question: string; xlabel?: string; ylabel?: string; children?: ReactNode;
}) {
  const model = experimentModels[exp];
  const spec = model?.params.find((p) => p.key === over);
  const useLog = log !== undefined && log !== false && log !== "false";
  const tf = (v: number) => (useLog ? Math.log10(Math.max(v, 1e-4)) : v);

  const data = useMemo(() => {
    if (!model?.sweep) return null;
    const seed = model.presets[preset]?.seed ?? 1;
    const s = model.sweep(defaultParams(model, preset), over, seed);
    const xs = s.map((p) => p.value);
    const ys = s.map((p) => tf(p.metrics[metric]));
    const ys2 = also ? s.map((p) => tf(p.metrics[also])) : null;
    const all = [...ys, ...(ys2 ?? [])].filter(Number.isFinite);
    const lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.25 || 1;
    return { xs, ys, ys2, y0: lo - pad, y1: hi + pad };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, preset, over, metric, also, useLog]);

  const [guess, setGuess] = useState<(number | null)[]>(() => (data ? data.xs.map(() => null) : []));
  const [revealed, setRevealed] = useState(false);
  const last = useRef<number | null>(null);
  const svgWrap = useRef<HTMLDivElement>(null);

  if (!model || !spec || !data) return <p className="text-bad">DrawIt 配置有误：{exp}/{over}/{metric}</p>;

  const F: Frame = { W: 600, H: 300, left: 56, right: 14, top: 12, bottom: 30, x0: data.xs[0], x1: data.xs[data.xs.length - 1], y0: data.y0, y1: data.y1 };
  const ticksX = data.xs.length <= 14 ? data.xs : data.xs.filter((_, i) => i % Math.ceil(data.xs.length / 8) === 0);
  const yStep = niceStep((F.y1 - F.y0) / 5);
  const ticksY: number[] = [];
  for (let v = Math.ceil(F.y0 / yStep) * yStep; v <= F.y1 + 1e-9; v += yStep) ticksY.push(+v.toFixed(6));

  const toData = (clientX: number, clientY: number) => {
    const svg = svgWrap.current?.querySelector("svg");
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    const fx = F.x0 + ((p.x - F.left) / (F.W - F.left - F.right)) * (F.x1 - F.x0);
    const fy = F.y1 - ((p.y - F.top) / (F.H - F.top - F.bottom)) * (F.y1 - F.y0);
    let i = 0;
    data.xs.forEach((x, j) => { if (Math.abs(x - fx) < Math.abs(data.xs[i] - fx)) i = j; });
    return { i, y: Math.max(F.y0, Math.min(F.y1, fy)) };
  };
  const paint = (clientX: number, clientY: number) => {
    const d = toData(clientX, clientY);
    if (!d) return;
    setGuess((g) => {
      const n = [...g];
      const from = last.current ?? d.i;
      const a = Math.min(from, d.i), b = Math.max(from, d.i);
      const yFrom = g[from] ?? d.y;
      for (let k = a; k <= b; k++) n[k] = b === a ? d.y : from < d.i ? yFrom + ((k - a) / (b - a)) * (d.y - yFrom) : d.y + ((k - a) / (b - a)) * (yFrom - d.y);
      n[d.i] = d.y;
      return n;
    });
    last.current = d.i;
  };

  const filled = fillGuess(guess);
  const cov = coverage(guess);
  const score = revealed && filled ? scoreDrawing(filled, data.ys, F.y1 - F.y0) : null;
  const path = (ys: (number | null)[]) => {
    let d = "", pen = false;
    ys.forEach((y, i) => {
      if (y === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${sx(F, data.xs[i]).toFixed(1)} ${sy(F, y).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const fmtY = (v: number) => (useLog ? (Math.abs(v) < 1e-9 ? "1" : `1e${+v.toFixed(1)}`) : String(+v.toFixed(2)));
  const xName = xlabel ?? spec.label;
  const yName = ylabel ?? model.metrics.find((m) => m.key === metric)?.label ?? metric;

  return (
    <section className="space-y-3 rounded-[var(--radius-ku)] border-2 border-ink bg-surface p-4 shadow-[var(--shadow-card)]" aria-label={`${t.drawTitle}：${question}`} data-drawit={id}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono rounded bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">{t.drawTitle}</span>
        {!revealed && <span className="text-xs text-muted">{t.drawHint}</span>}
      </div>
      <p className="font-bold leading-relaxed">{question}</p>
      <div ref={svgWrap} className={revealed ? "" : "draw-area"}
        onPointerDown={(e) => { if (revealed) return; e.currentTarget.setPointerCapture(e.pointerId); last.current = null; paint(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (!revealed && e.buttons & 1) paint(e.clientX, e.clientY); }}
        onPointerUp={() => { last.current = null; }}>
        <Plot frame={F} xTicks={ticksX} yTicks={ticksY} xFmt={(v) => formatParam(spec, v)} yFmt={fmtY}
          label={revealed
            ? `真实曲线：${data.xs.map((x, i) => `${xName} ${formatParam(spec, x)} 时 ${fmtY(data.ys[i])}`).join("；")}`
            : `${t.drawTitle}。横轴${xName}，纵轴${yName}。用鼠标或手指画线；也可以用下方的表格输入。`}>
          {!revealed && <rect x={F.left} y={F.top} width={F.W - F.left - F.right} height={F.H - F.top - F.bottom} fill="transparent" />}
          {filled && revealed && <path className="ln-guess" d={path(filled)} opacity={0.75} />}
          {!revealed && <path className="ln-guess" d={path(guess)} />}
          {!revealed && guess.map((y, i) => y !== null && <circle key={i} cx={sx(F, data.xs[i])} cy={sy(F, y)} r={3} fill="var(--color-ink)" />)}
          {revealed && data.ys2 && <path className="ln-train reveal-line" d={path(data.ys2)} />}
          {revealed && <path className="ln-test reveal-line" d={path(data.ys)} style={{ strokeWidth: 3 }} />}
          {revealed && data.ys.map((y, i) => <circle key={i} className="dot-test" cx={sx(F, data.xs[i])} cy={sy(F, y)} r={3} />)}
        </Plot>
        <div className="flex flex-wrap justify-between gap-2 px-1 text-xs text-muted">
          <span>纵轴：{yName}{useLog ? "（对数）" : ""}</span>
          <span>横轴：{xName}</span>
        </div>
      </div>
      {revealed && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-1 w-5 rounded bg-accent" />你画的</span>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[3px] w-5 rounded bg-test" />真实的{yName}</span>
          {data.ys2 && also && <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-5 rounded bg-train" />{model.metrics.find((m) => m.key === also)?.label}</span>}
        </div>
      )}

      {!revealed ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setRevealed(true)} disabled={cov < 0.5}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-bold text-on-primary disabled:opacity-40">{t.drawSubmit}</button>
          <button type="button" onClick={() => setGuess(data.xs.map(() => null))} className="min-h-11 rounded-lg border border-line px-4 text-sm">{t.drawAgain}</button>
          {cov > 0 && cov < 0.5 && <span className="text-xs text-muted">{t.drawNeedMore}</span>}
          <details className="w-full text-sm">
            <summary className="cursor-pointer text-muted">不方便画？用键盘逐个输入</summary>
            <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(7.5em,1fr))] gap-2">
              {data.xs.map((x, i) => (
                <label key={i} className="grid gap-0.5 text-xs text-muted">
                  {xName} {formatParam(spec, x)}
                  <input type="range" min={F.y0} max={F.y1} step={(F.y1 - F.y0) / 50} value={guess[i] ?? (F.y0 + F.y1) / 2}
                    aria-valuetext={guess[i] === null ? "未填" : fmtY(guess[i]!)}
                    onChange={(e) => { const v = Number(e.target.value); setGuess((g) => g.map((y, j) => (j === i ? v : y))); }} />
                </label>
              ))}
            </div>
          </details>
        </div>
      ) : (
        score && (
          <div className="space-y-2 rounded-lg border-l-4 border-accent bg-accent-soft px-4 py-3" role="status">
            <p className="font-bold">
              吻合度 <span className="mono">{score.score}</span> / 100
              {score.actualHasValley && (score.guessMin === score.actualMin
                ? "，最低点画对了！"
                : `。你画的最低点在 ${xName} ${formatParam(spec, data.xs[score.guessMin])}，实际在 ${formatParam(spec, data.xs[score.actualMin])}。`)}
              {!score.actualHasValley && (score.trendRight ? "，整体趋势画对了。" : "，整体趋势和实际相反。")}
            </p>
            {children && <div className="ku-prose text-[15px]">{children}</div>}
            <button type="button" onClick={() => { setRevealed(false); setGuess(data.xs.map(() => null)); }} className="text-xs text-muted underline hover:text-ink">{t.drawAgain}</button>
          </div>
        )
      )}
    </section>
  );
}

function niceStep(raw: number): number {
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
}
