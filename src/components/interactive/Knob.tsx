"use client";
import { useRef, useState } from "react";
import { setChannelParams, useChannelLocked, useExperimentParams } from "@/experiments/channel";
import { experimentModels } from "@/experiments/models";
import { paramValues, type ParamSpec } from "@/experiments/types";

const PX_PER_STEP = 12;

export function formatParam(spec: ParamSpec, v: number | boolean): string {
  if (spec.kind === "bool") return v ? "开" : "关";
  if (spec.kind === "enum") return spec.options.find((o) => o.value === v)?.label ?? String(v);
  const decimals = Math.max(0, (String(spec.step).split(".")[1] ?? "").length);
  return Number(v).toFixed(decimals);
}

/** 正文里的可拖数字：左右拖、方向键都能改，和同一通道的实验联动（Bret Victor 的 Tangle 那种）。 */
export default function Knob({ ch, exp, preset = "article", name }: { ch: string; exp: string; preset?: string; name: string }) {
  const model = experimentModels[exp];
  const [params] = useExperimentParams(model, preset, ch);
  const locked = useChannelLocked(ch, model, preset);
  const drag = useRef<{ x: number; i0: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const spec = model?.params.find((p) => p.key === name);
  if (!model || !spec) return <b className="text-bad">[{name}?]</b>;

  const values = paramValues(spec);
  const cur = params[name];
  const idx = Math.max(0, values.findIndex((v) => Math.abs(v - Number(cur)) < 1e-9));
  const setIdx = (i: number) => {
    const j = Math.max(0, Math.min(values.length - 1, i));
    const v = spec.kind === "bool" ? values[j] === 1 : values[j];
    setChannelParams(ch, model, preset, (o) => (o[name] === v ? o : { ...o, [name]: v }));
  };

  return (
    <span
      className="knob"
      role="slider"
      tabIndex={locked ? -1 : 0}
      aria-label={spec.label}
      aria-valuemin={0}
      aria-valuemax={values.length - 1}
      aria-valuenow={idx}
      aria-valuetext={formatParam(spec, cur)}
      aria-disabled={locked || undefined}
      data-dragging={dragging ? "1" : undefined}
      title={`左右拖动改变${spec.label}`}
      onPointerDown={(e) => {
        if (locked) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, i0: idx };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        setIdx(drag.current.i0 + Math.round((e.clientX - drag.current.x) / PX_PER_STEP));
      }}
      onPointerUp={() => { drag.current = null; setDragging(false); }}
      onPointerCancel={() => { drag.current = null; setDragging(false); }}
      onKeyDown={(e) => {
        if (locked) return;
        const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
        if (d) { e.preventDefault(); setIdx(idx + d); }
        else if (e.key === "Home") { e.preventDefault(); setIdx(0); }
        else if (e.key === "End") { e.preventDefault(); setIdx(values.length - 1); }
      }}
    >
      <span aria-hidden className="knob-arrow">◂</span>
      {formatParam(spec, cur)}
      <span aria-hidden className="knob-arrow">▸</span>
    </span>
  );
}
