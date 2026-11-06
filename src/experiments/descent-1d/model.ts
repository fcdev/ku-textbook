import { defaultParams, type ExperimentModel, type Metrics, type Params } from "../types";

/**
 * 一维损失曲线。第一个月用纯二次函数 L(w) = A·(w − W_STAR)²，学习率的临界值有解析解（lr = 1/A 时来回震荡，> 1/A 发散），
 * 便于出题和讲原理。
 */
export const A = 1;
export const W_STAR = 1;
export const loss = (w: number) => A * (w - W_STAR) ** 2;
export const grad = (w: number) => 2 * A * (w - W_STAR);

export const LRS = [0.01, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 1.05, 1.1];
export const MAX_STEPS = 60;
const DIVERGE = 1e6;

/** 从 w0 开始走 steps 步，返回整条轨迹。 */
export function trajectory(w0: number, lr: number, steps: number): number[] {
  const ws = [w0];
  let w = w0;
  for (let i = 0; i < steps; i++) {
    w = w - lr * grad(w);
    if (!Number.isFinite(w) || Math.abs(w) > DIVERGE) {
      ws.push(w > 0 ? DIVERGE : -DIVERGE);
      break;
    }
    ws.push(w);
  }
  return ws;
}

export function solveDescent(params: Params) {
  const ws = trajectory(Number(params.w0), Number(params.lr), Number(params.steps));
  const w = ws[ws.length - 1];
  const diverged = Math.abs(w) >= DIVERGE || Math.abs(w - W_STAR) > Math.abs(Number(params.w0) - W_STAR) * 1.0001;
  // 用这个学习率需要多少步才能到最低点附近（|w − w*| < 0.01），在 MAX_STEPS 步内算；到不了就是 -1。
  // 与当前已走步数无关，方便出“选一个学习率”的题。
  const full = trajectory(Number(params.w0), Number(params.lr), MAX_STEPS);
  let stepsTo = -1;
  for (let i = 0; i < full.length; i++) if (Math.abs(full[i] - W_STAR) < 0.01) { stepsTo = i; break; }
  return {
    ws,
    metrics: { loss: Math.min(loss(w), 1e12), w, dist: Math.abs(w - W_STAR), diverged: diverged ? 1 : 0, stepsTo } as Metrics,
  };
}

export const descent1dModel: ExperimentModel = {
  id: "descent-1d",
  params: [
    { key: "lr", label: "学习率 η", kind: "enum", options: LRS.map((v) => ({ value: v, label: String(v) })), default: 0.1 },
    { key: "w0", label: "起点 w₀", kind: "float", min: -2, max: 4, step: 0.1, default: -1.5 },
    { key: "steps", label: "已走步数", kind: "int", min: 0, max: MAX_STEPS, step: 1, default: 0 },
  ],
  metrics: [
    { key: "loss", label: "当前损失", format: "error" },
    { key: "w", label: "当前 w", format: "number" },
    { key: "dist", label: "离最低点", format: "number" },
    { key: "diverged", label: "是否发散", format: "number" },
    { key: "stepsTo", label: "到达最低点需要的步数", format: "number" },
  ],
  layers: ["trail", "tangent"],
  presets: {
    article: { params: { lr: 0.1, w0: -1.5, steps: 0 }, visibleControls: ["steps"], seed: 1 },
    "lr-article": { params: { lr: 0.1, w0: -1.5, steps: 0 }, visibleControls: ["lr", "steps"], seed: 1 },
    practice: { params: { lr: 0.1, w0: -1.5, steps: 0 }, visibleControls: ["steps"], seed: 1 },
    "lr-practice": { params: { lr: 0.01, w0: -1.5, steps: 0 }, visibleControls: ["lr", "steps"], seed: 1 },
    lab: { params: { lr: 0.1, w0: -1.5, steps: 0 }, seed: 1 },
  },
  compute(params) {
    return solveDescent({ ...defaultParams(descent1dModel), ...params }).metrics;
  },
  sweep(params, key) {
    const spec = descent1dModel.params.find((p) => p.key === key);
    if (!spec || spec.kind === "bool") throw new Error(`descent-1d 不能扫描参数 ${key}`);
    const values = spec.kind === "enum" ? spec.options.map((o) => o.value) : Array.from({ length: Math.round((spec.max - spec.min) / spec.step) + 1 }, (_, i) => +(spec.min + i * spec.step).toFixed(10));
    return values.map((value) => ({ value, metrics: descent1dModel.compute({ ...params, [key]: value }, 0) }));
  },
};
