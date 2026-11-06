"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatError } from "@/lib/numeric";
import { useStill } from "@/lib/still";
import { useExperimentParams } from "../channel";
import { Btn, Metric, Slider } from "../primitives";
import type { ExperimentProps } from "../types";
import { actOf, hiddenOf, N_POINTS, NET_LRS, TEST_OFFSET, tinyNetModel } from "./model";
import { DATASETS, makeDataset, TinyNet as Net, type Point } from "./net";

const RES = 64;
const EPOCHS_PER_FRAME = 4;
const MAX_EPOCHS = 3000;

function css(name: string, fb: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
}
function hex(c: string): [number, number, number] {
  const m = c.match(/^#([0-9a-f]{6})$/i);
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 在浏览器里训练一个小神经网络做二分类：看决策边界一点点长出来。可以点图加点。 */
export default function TinyNet({ preset, channel, onState, readOnly }: ExperimentProps) {
  const p = tinyNetModel.presets[preset] ?? tinyNetModel.presets.lab;
  const [params, setParams] = useExperimentParams(tinyNetModel, preset, channel);
  const isLab = !p.visibleControls;
  const visible = p.visibleControls ?? tinyNetModel.params.map((s) => s.key);
  const seed = p.seed ?? 1;
  const still = useStill();

  const archKey = `${params.layers}|${params.width}|${params.act}`;
  const dataKey = `${params.dataset}|${params.noise}`;
  const base = useMemo(() => makeDataset(Number(params.dataset), N_POINTS, Number(params.noise), seed), [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const test = useMemo(() => makeDataset(Number(params.dataset), N_POINTS, Number(params.noise), seed + TEST_OFFSET), [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [extra, setExtra] = useState<Point[]>([]);
  const data = useMemo(() => [...base, ...extra], [base, extra]);

  const net = useRef<Net>(null as unknown as Net);
  const [, force] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [addLabel, setAddLabel] = useState<0 | 1>(1);
  const canvas = useRef<HTMLCanvasElement>(null);

  const reset = useCallback(() => {
    net.current = new Net(hiddenOf(params), actOf(params), seed);
    setHistory([net.current.loss(data)]);
    force((n) => n + 1);
  }, [archKey, data]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { reset(); }, [archKey, dataKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setExtra([]); }, [dataKey]);

  const draw = useCallback(() => {
    const c = canvas.current, n = net.current;
    if (!c || !n) return;
    const ctx = c.getContext("2d")!;
    const W = c.width, H = c.height;
    const A = hex(css("--color-accent", "#F4C430")), B = hex(css("--color-ink", "#17181C")), S = hex(css("--color-surface", "#FFFFFF"));
    const img = ctx.createImageData(RES, RES);
    for (let j = 0; j < RES; j++) for (let i = 0; i < RES; i++) {
      const x = -1.2 + (2.4 * (i + 0.5)) / RES, y = 1.2 - (2.4 * (j + 0.5)) / RES;
      const pr = n.predict(x, y);
      const col = pr > 0.5 ? B : A, a = Math.min(1, Math.abs(pr - 0.5) * 2) * (pr > 0.5 ? 0.16 : 0.38);
      const k = (j * RES + i) * 4;
      for (let q = 0; q < 3; q++) img.data[k + q] = Math.round(S[q] * (1 - a) + col[q] * a);
      img.data[k + 3] = 255;
    }
    const off = document.createElement("canvas");
    off.width = RES; off.height = RES;
    off.getContext("2d")!.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, W, H);
    // 决策边界 p = 0.5
    ctx.strokeStyle = css("--color-ink", "#17181C");
    ctx.lineWidth = 2;
    const g = 96, cell = W / g;
    const pv: number[][] = [];
    for (let j = 0; j <= g; j++) { pv.push([]); for (let i = 0; i <= g; i++) pv[j].push(n.predict(-1.2 + (2.4 * i) / g, 1.2 - (2.4 * j) / g) - 0.5); }
    ctx.beginPath();
    for (let j = 0; j < g; j++) for (let i = 0; i < g; i++) {
      const v = [pv[j][i], pv[j][i + 1], pv[j + 1][i + 1], pv[j + 1][i]];
      const pts: [number, number][] = [];
      const corners: [number, number][] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      for (let e = 0; e < 4; e++) {
        const a = v[e], b = v[(e + 1) % 4];
        if ((a < 0) !== (b < 0)) {
          const tt = a / (a - b), [x1, y1] = corners[e], [x2, y2] = corners[(e + 1) % 4];
          pts.push([(x1 + (x2 - x1) * tt) * cell, (y1 + (y2 - y1) * tt) * cell]);
        }
      }
      if (pts.length >= 2) { ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); }
    }
    ctx.stroke();
    // 数据点
    const toPx = (x: number, y: number): [number, number] => [((x + 1.2) / 2.4) * W, ((1.2 - y) / 2.4) * H];
    for (const pt of data) {
      const [px, py] = toPx(pt.x, pt.y);
      ctx.beginPath();
      ctx.arc(px, py, W / 95, 0, Math.PI * 2);
      ctx.fillStyle = pt.label ? css("--color-ink", "#17181C") : css("--color-accent", "#F4C430");
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = pt.label ? css("--color-surface", "#fff") : css("--color-ink", "#17181C");
      ctx.stroke();
    }
  }, [data]);

  useEffect(() => { draw(); }, [draw, history]);

  // 训练循环：每帧几轮，静止模式下一口气训练完再画
  useEffect(() => {
    if (!running) return;
    const lr = Number(params.lr);
    if (still) {
      const n = net.current, h: number[] = [];
      for (let e = 0; e < 500 && n.epoch < MAX_EPOCHS; e++) { const l = n.trainEpoch(data, lr); if (e % 10 === 0) h.push(l); }
      setHistory((o) => [...o, ...h].slice(-300));
      setRunning(false);
      return;
    }
    let raf = 0;
    const tick = () => {
      const n = net.current;
      let l = 0;
      for (let e = 0; e < EPOCHS_PER_FRAME; e++) l = n.trainEpoch(data, lr);
      setHistory((o) => [...o, l].slice(-300));
      if (n.epoch >= MAX_EPOCHS) { setRunning(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, still, data, params.lr]);
  useEffect(() => { if (readOnly) setRunning(false); }, [readOnly]);

  const metrics = useMemo(() => {
    const n = net.current;
    if (!n) return { loss: 0, trainAcc: 0, testAcc: 0, paramCount: 0 };
    return { loss: n.loss(data), trainAcc: n.accuracy(data), testAcc: n.accuracy(test), paramCount: n.paramCount };
  }, [history, data, test]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onState?.({ params, metrics }); }, [params, metrics, onState]);

  const addPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = -1.2 + ((e.clientX - r.left) / r.width) * 2.4, y = 1.2 - ((e.clientY - r.top) / r.height) * 2.4;
    setExtra((o) => [...o, { x, y, label: addLabel }]);
  };
  const set = (k: string, v: number) => { setRunning(false); setParams((o) => ({ ...o, [k]: v })); };
  const epoch = net.current?.epoch ?? 0;
  const label = `${DATASETS[Number(params.dataset)]}数据，${params.layers} 个隐藏层、每层 ${params.width} 个神经元，已训练 ${epoch} 轮，训练准确率 ${(metrics.trainAcc * 100).toFixed(0)}%`;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-[var(--radius-ku)] border border-line bg-surface p-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,14em)]">
        <div>
          <canvas ref={canvas} width={480} height={480} onClick={addPoint} role="img" aria-label={label}
            className="block aspect-square w-full rounded-md border border-line" style={{ cursor: readOnly ? undefined : "crosshair" }} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 pt-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-full border border-ink bg-accent" />黄类</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block size-3 rounded-full bg-ink" />黑类</span>
            <span className="inline-flex items-center gap-1.5"><i className="inline-block h-[2px] w-4 bg-ink" />决策边界</span>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <NetDiagram sizes={[2, ...hiddenOf(params), 1]} />
          <LossSpark history={history} />
          <div className="grid gap-1" aria-live="polite">
            <Metric label="轮数" value={String(epoch)} />
            <Metric label="损失" value={formatError(metrics.loss)} tone="model" />
            <Metric label="训练准确率" value={`${(metrics.trainAcc * 100).toFixed(0)}%`} tone={metrics.trainAcc > 0.95 ? "good" : "ink"} />
            <Metric label="测试准确率" value={`${(metrics.testAcc * 100).toFixed(0)}%`} tone="test" />
            <Metric label="参数个数" value={String(metrics.paramCount)} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn primary pressed={running} onClick={() => setRunning((v) => !v)} disabled={readOnly}>{running ? "暂停" : epoch > 0 ? "继续训练" : "开始训练"}</Btn>
        <Btn onClick={() => { setRunning(false); reset(); }} disabled={readOnly}>重新初始化</Btn>
        {isLab && (
          <>
            <Btn pressed={addLabel === 1} onClick={() => setAddLabel(1)} disabled={readOnly}>点图加黑点</Btn>
            <Btn pressed={addLabel === 0} onClick={() => setAddLabel(0)} disabled={readOnly}>点图加黄点</Btn>
            {extra.length > 0 && <Btn onClick={() => setExtra([])} disabled={readOnly}>清除我加的点</Btn>}
          </>
        )}
      </div>

      {isLab && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="数据">
          {DATASETS.map((d, i) => <Btn key={d} pressed={Number(params.dataset) === i} onClick={() => set("dataset", i)} disabled={readOnly}>{d}</Btn>)}
        </div>
      )}
      <div className="space-y-1">
        {visible.includes("layers") && <Slider label="隐藏层数" min={1} max={3} value={Number(params.layers)} onChange={(v) => set("layers", v)} disabled={readOnly} />}
        {visible.includes("width") && <Slider label="每层神经元" min={1} max={8} value={Number(params.width)} onChange={(v) => set("width", v)} disabled={readOnly} />}
        {visible.includes("act") && <Slider label="激活函数" min={0} max={1} value={Number(params.act)} display={Number(params.act) ? "tanh" : "ReLU"} onChange={(v) => set("act", v)} disabled={readOnly} />}
        {visible.includes("lr") && <Slider label="学习率" min={0} max={NET_LRS.length - 1} value={Math.max(0, NET_LRS.indexOf(Number(params.lr)))} display={String(params.lr)} onChange={(i) => set("lr", NET_LRS[i])} disabled={readOnly} />}
        {visible.includes("noise") && <Slider label="噪声" min={0} max={0.3} step={0.01} value={Number(params.noise)} display={Number(params.noise).toFixed(2)} onChange={(v) => set("noise", v)} disabled={readOnly} />}
      </div>
    </div>
  );
}

function NetDiagram({ sizes }: { sizes: number[] }) {
  const W = 220, H = 96, cols = sizes.length;
  const pos = sizes.map((n, l) => Array.from({ length: n }, (_, i) => [14 + (l * (W - 28)) / (cols - 1), H / 2 + (i - (n - 1) / 2) * Math.min(12, (H - 16) / Math.max(1, n - 1))]));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`网络结构：${sizes.join(" → ")}`}>
      {pos.slice(0, -1).flatMap((col, l) => col.flatMap(([x1, y1], i) => pos[l + 1].map(([x2, y2], j) => (
        <line key={`${l}-${i}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--color-line-strong)" strokeWidth={0.8} />
      ))))}
      {pos.flatMap((col, l) => col.map(([x, y], i) => (
        <circle key={`${l}-${i}`} cx={x} cy={y} r={4.5} fill={l === 0 || l === cols - 1 ? "var(--color-accent)" : "var(--color-surface)"} stroke="var(--color-ink)" strokeWidth={1.2} />
      )))}
    </svg>
  );
}

function LossSpark({ history }: { history: number[] }) {
  const W = 220, H = 48;
  if (history.length < 2) return <div className="h-12 rounded border border-dashed border-line text-center text-xs leading-[48px] text-muted">损失曲线</div>;
  const max = Math.max(...history, 0.01);
  const d = history.map((v, i) => `${i ? "L" : "M"}${((i / (history.length - 1)) * W).toFixed(1)} ${(H - 2 - (v / max) * (H - 6)).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-line" role="img" aria-label={`损失从 ${history[0].toFixed(2)} 降到 ${history[history.length - 1].toFixed(2)}`}>
      <path d={d} fill="none" stroke="var(--color-model)" strokeWidth={1.6} />
    </svg>
  );
}
