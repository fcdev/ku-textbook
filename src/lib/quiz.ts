import type { ExperimentModel, Params, Metrics } from "@/experiments/types";
import type { ChoiceQuestion, ExperimentQuestion, Question, QuizCheck } from "./schema";

export const XP_PER_CORRECT = 10;

export function gradeChoice(q: ChoiceQuestion, picked: number | null): boolean {
  return picked !== null && picked === q.answer;
}

/**
 * 按 check 判断当前实验状态。near-min / near-max 需要实验提供 sweep：
 * 找到最优取值后，当前取值与之相差 ≤ steps 步，且指标在 ratio 倍以内即算对。
 */
export function gradeCheck(
  check: QuizCheck,
  state: { params: Params; metrics: Metrics },
  model: ExperimentModel,
  seed: number,
): boolean {
  const v = state.metrics[check.metric];
  if (v === undefined || Number.isNaN(v)) return false;
  switch (check.op) {
    case "<": return v < check.value;
    case "<=": return v <= check.value;
    case ">": return v > check.value;
    case ">=": return v >= check.value;
    case "between": return v >= check.value[0] && v <= check.value[1];
    case "near-min":
    case "near-max": {
      if (!model.sweep) throw new Error(`实验 ${model.id} 没有 sweep，不能用 ${check.op}`);
      const pts = model.sweep(state.params, check.over, seed);
      const isMin = check.op === "near-min";
      let bestI = 0;
      pts.forEach((p, i) => {
        const a = p.metrics[check.metric], b = pts[bestI].metrics[check.metric];
        if (isMin ? a < b : a > b) bestI = i;
      });
      const cur = Number(state.params[check.over]);
      const curI = pts.findIndex((p) => Math.abs(p.value - cur) < 1e-9);
      if (curI < 0) return false;
      const best = pts[bestI].metrics[check.metric];
      const { steps, ratio } = check.tolerance;
      const withinSteps = Math.abs(curI - bestI) <= steps;
      const withinRatio = isMin ? v <= best * ratio : v >= best / ratio;
      return withinSteps && withinRatio;
    }
  }
}

export function gradeExperiment(
  q: ExperimentQuestion,
  state: { params: Params; metrics: Metrics } | null,
  model: ExperimentModel,
  seed: number,
): boolean {
  return state !== null && gradeCheck(q.check, state, model, seed);
}

export type Answer = { kind: "choice"; picked: number | null } | { kind: "experiment"; state: { params: Params; metrics: Metrics } | null };

export function grade(q: Question, a: Answer, model?: ExperimentModel, seed = 0): boolean {
  if (q.type === "choice") return a.kind === "choice" && gradeChoice(q, a.picked);
  if (!model) throw new Error(`题目 ${q.id} 缺少实验 ${q.experiment.id}`);
  return a.kind === "experiment" && gradeExperiment(q, a.state, model, seed);
}
