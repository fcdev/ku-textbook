import type { ComponentType } from "react";

export type ParamValue = number | boolean;
export type Params = Record<string, ParamValue>;
export type Metrics = Record<string, number>;

export type ParamSpec =
  | { key: string; label: string; kind: "int" | "float"; min: number; max: number; step: number; default: number }
  | { key: string; label: string; kind: "enum"; options: { value: number; label: string }[]; default: number }
  | { key: string; label: string; kind: "bool"; default: boolean };

export interface MetricSpec {
  key: string;
  label: string;
  format: "error" | "percent" | "number";
}

export interface ExperimentState {
  params: Params;
  metrics: Metrics;
}

export interface Preset {
  params?: Partial<Params>;
  /** 可见的滑块；省略 = 全部 */
  visibleControls?: string[];
  seed?: number;
}

/**
 * 实验的纯数据部分（无 React）。ku-lint、判分和单测只依赖它。
 * 见 docs/DECISIONS.md：SPEC 里的 ExperimentDef 拆成 model（纯）+ Component（客户端）。
 */
export interface ExperimentModel {
  id: string;
  params: ParamSpec[];
  metrics: MetricSpec[];
  /** 可以在题目 hide 里隐藏的图层 */
  layers?: string[];
  presets: Record<string, Preset>;
  compute(params: Params, seed: number): Metrics;
  sweep?(params: Params, key: string, seed: number): { value: number; metrics: Metrics }[];
}

export interface ExperimentProps {
  preset: string;
  hide?: string[];
  onState?: (s: ExperimentState) => void;
  readOnly?: boolean;
  /** 原理层：额外显示误差-参数曲线 */
  showSweep?: boolean;
}

export interface ExperimentDef extends ExperimentModel {
  Component: ComponentType<ExperimentProps>;
}

export function defaultParams(model: ExperimentModel, preset?: string): Params {
  const p: Params = {};
  for (const s of model.params) p[s.key] = s.default;
  return { ...p, ...(preset ? (model.presets[preset]?.params as Params | undefined) : {}) };
}

export function paramValues(spec: ParamSpec): number[] {
  if (spec.kind === "enum") return spec.options.map((o) => o.value);
  if (spec.kind === "bool") return [0, 1];
  const out: number[] = [];
  for (let v = spec.min; v <= spec.max + 1e-9; v += spec.step) out.push(+v.toFixed(10));
  return out;
}
