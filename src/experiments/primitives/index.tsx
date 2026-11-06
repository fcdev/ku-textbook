"use client";
import { useId, type ReactNode } from "react";
import { formatError } from "@/lib/numeric";

/* ---------- 坐标系 ---------- */
export interface Frame {
  W: number; H: number;
  left: number; right: number; top: number; bottom: number;
  x0: number; x1: number; y0: number; y1: number;
}
export const sx = (f: Frame, x: number) => f.left + ((x - f.x0) / (f.x1 - f.x0)) * (f.W - f.left - f.right);
export const sy = (f: Frame, y: number) => f.top + ((f.y1 - y) / (f.y1 - f.y0)) * (f.H - f.top - f.bottom);

/** 采样函数成 SVG path，y 超出范围时截断，避免极端值撑爆路径。 */
export function fnPath(f: Frame, fn: (x: number) => number, samples = 200): string {
  let d = "";
  const pad = (f.y1 - f.y0) * 2;
  for (let i = 0; i <= samples; i++) {
    const x = f.x0 + ((f.x1 - f.x0) * i) / samples;
    const y = Math.max(f.y0 - pad, Math.min(f.y1 + pad, fn(x)));
    d += `${i ? "L" : "M"}${sx(f, x).toFixed(1)} ${sy(f, y).toFixed(1)}`;
  }
  return d;
}

/** 坐标纸式画框：网格 + 刻度 + 裁剪区。children 画在裁剪区里。 */
export function Plot({ frame: f, xTicks, yTicks, label, children, overlay, xFmt = (v) => v.toFixed(1), yFmt = (v) => v.toFixed(1) }: {
  frame: Frame;
  xTicks: number[];
  yTicks: number[];
  label: string;
  children: ReactNode;
  overlay?: ReactNode;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
}) {
  const clip = useId().replace(/:/g, "");
  return (
    <svg className="plot" viewBox={`0 0 ${f.W} ${f.H}`} role="img" aria-label={label}>
      <defs>
        <clipPath id={clip}>
          <rect x={f.left} y={f.top} width={f.W - f.left - f.right} height={f.H - f.top - f.bottom} />
        </clipPath>
      </defs>
      {xTicks.map((x) => (
        <g key={`x${x}`}>
          <line className="gridline" x1={sx(f, x)} x2={sx(f, x)} y1={f.top} y2={f.H - f.bottom} />
          <text x={sx(f, x)} y={f.H - 6} textAnchor="middle">{xFmt(x)}</text>
        </g>
      ))}
      {yTicks.map((y) => (
        <g key={`y${y}`}>
          <line className={y === 0 ? "axis" : "gridline"} x1={f.left} x2={f.W - f.right} y1={sy(f, y)} y2={sy(f, y)} />
          <text x={f.left - 6} y={sy(f, y) + 4} textAnchor="end">{yFmt(y)}</text>
        </g>
      ))}
      <g clipPath={`url(#${clip})`}>{children}</g>
      {overlay}
    </svg>
  );
}

/* ---------- 滑块 ---------- */
export function Slider({ label, value, min, max, step = 1, display, onChange, disabled }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="slider">
      <label htmlFor={id} className="text-sm text-muted">{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={display ?? String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output htmlFor={id} className="mono text-sm">{display ?? value}</output>
    </div>
  );
}

/* ---------- 读数 ---------- */
export function Readout({ train, test }: { train?: number; test?: number }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" aria-live="polite">
      {train !== undefined && (
        <span className="inline-flex items-center gap-2">
          <i aria-hidden className="inline-block size-2.5 rounded-full bg-train" />
          训练误差 <b className="mono inline-block min-w-[5ch] text-train">{formatError(train)}</b>
        </span>
      )}
      {test !== undefined && (
        <span className="inline-flex items-center gap-2">
          <i aria-hidden className="inline-block size-2.5 rounded-full border-2 border-test" />
          测试误差 <b className="mono inline-block min-w-[5ch] text-test">{formatError(test)}</b>
        </span>
      )}
    </div>
  );
}

/* ---------- 图例 ---------- */
export function Legend({ items }: { items: ("train" | "test" | "model" | "truth")[] }) {
  const text = { train: "训练数据", test: "测试数据", model: "模型曲线", truth: "真实规律" };
  const mark = {
    train: <i className="inline-block size-2.5 rounded-full bg-train" />,
    test: <i className="inline-block size-2.5 rounded-full border-2 border-test" />,
    model: <i className="inline-block h-[3px] w-4 rounded bg-model" />,
    truth: <i className="inline-block w-4 border-t-2 border-dashed border-truth" />,
  };
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((k) => (
        <span key={k} className="inline-flex items-center gap-1.5">{mark[k]}{text[k]}</span>
      ))}
    </div>
  );
}

/* ---------- 通用读数 ---------- */
export function Metric({ label, value, tone = "ink", mark }: { label: string; value: string; tone?: "ink" | "train" | "test" | "model" | "good" | "bad"; mark?: ReactNode }) {
  const color = { ink: "text-ink", train: "text-train", test: "text-test", model: "text-ink", good: "text-good", bad: "text-bad" }[tone];
  return (
    <span className="inline-flex items-center gap-2">
      {mark}
      {label} <b className={`mono inline-block min-w-[5ch] ${color}`}>{value}</b>
    </span>
  );
}

export function Btn({ children, onClick, pressed, disabled, primary }: { children: ReactNode; onClick: () => void; pressed?: boolean; disabled?: boolean; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} disabled={disabled}
      className={`min-h-11 rounded-lg border px-4 text-sm disabled:opacity-40 ${primary ? "border-primary bg-primary font-bold text-on-primary" : "border-line bg-surface hover:border-primary"}`}>
      {children}
    </button>
  );
}
