import { defaultParams, type ExperimentModel, type Metrics, type Params } from "../types";

/**
 * 二维损失曲面上的梯度下降（3D 招牌实验）。三种地形：
 *  0 椭圆碗：一个方向陡、一个方向缓，学习率稍大就在陡的方向来回“之”字形；
 *  1 两个山谷：左边深、右边浅，从哪里出发决定落进哪个谷（局部最小值）；
 *  2 弯曲峡谷：Rosenbrock 型，谷底又窄又弯，梯度下降走得很慢，动量能帮忙。
 */
export interface Surface {
  name: string;
  /** 画图范围 [x0, x1] × [y0, y1] */
  box: [number, number, number, number];
  loss(x: number, y: number): number;
  grad(x: number, y: number): [number, number];
  /** 全局 / 局部最小值，画标记用 */
  minima: [number, number][];
  /** 默认起点 */
  start: [number, number];
}

export const SURFACES: Surface[] = [
  {
    name: "椭圆碗",
    box: [-3, 3, -3, 3],
    loss: (x, y) => 0.5 * (x * x + 8 * y * y),
    grad: (x, y) => [x, 8 * y],
    minima: [[0, 0]],
    start: [-2.6, 1.6],
  },
  {
    name: "两个山谷",
    box: [-3, 3, -3, 3],
    loss: (x, y) => (x * x - 4) ** 2 / 10 + 0.5 * y * y + 0.3 * x + 1.2,
    grad: (x, y) => [(4 * x * (x * x - 4)) / 10 + 0.3, y],
    minima: [[-2.088, 0], [1.899, 0]],
    start: [0.4, 2.2],
  },
  {
    name: "弯曲峡谷",
    box: [-2, 2, -1, 3],
    loss: (x, y) => (1 - x) ** 2 + 5 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 20 * x * (y - x * x), 10 * (y - x * x)],
    minima: [[1, 1]],
    start: [-1.5, 2.5],
  },
];

export const LRS_2D = [0.005, 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.24, 0.26, 0.3, 0.5];
export const MOMENTA = [0, 0.5, 0.8, 0.9];
export const MAX_STEPS_2D = 120;
const DIVERGE = 1e4;

export function trajectory2d(surface: number, lr: number, momentum: number, x0: number, y0: number, steps: number): [number, number][] {
  const s = SURFACES[surface] ?? SURFACES[0];
  const pts: [number, number][] = [[x0, y0]];
  let x = x0, y = y0, vx = 0, vy = 0;
  for (let i = 0; i < steps; i++) {
    const [gx, gy] = s.grad(x, y);
    vx = momentum * vx - lr * gx;
    vy = momentum * vy - lr * gy;
    x += vx;
    y += vy;
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > DIVERGE || Math.abs(y) > DIVERGE) {
      pts.push([Math.sign(x || 1) * DIVERGE, Math.sign(y || 1) * DIVERGE]);
      break;
    }
    pts.push([x, y]);
  }
  return pts;
}

export function solveDescent2d(params: Params) {
  const surface = Number(params.surface), lr = Number(params.lr), mom = Number(params.momentum);
  const x0 = Number(params.x0), y0 = Number(params.y0), steps = Number(params.steps);
  const s = SURFACES[surface] ?? SURFACES[0];
  const pts = trajectory2d(surface, lr, mom, x0, y0, steps);
  const [x, y] = pts[pts.length - 1];
  const diverged = Math.abs(x) >= DIVERGE || Math.abs(y) >= DIVERGE;
  // 到达任意一个最小值附近（距离 < 0.05）需要的步数，在 MAX_STEPS_2D 内算，与当前步数无关；到不了是 -1
  const full = trajectory2d(surface, lr, mom, x0, y0, MAX_STEPS_2D);
  let stepsTo = -1, valley = -1;
  for (let i = 0; i < full.length && stepsTo < 0; i++) {
    s.minima.forEach(([mx, my], k) => {
      if (stepsTo < 0 && Math.hypot(full[i][0] - mx, full[i][1] - my) < 0.05) { stepsTo = i; valley = k; }
    });
  }
  return {
    pts,
    metrics: { loss: diverged ? 1e12 : Math.min(s.loss(x, y), 1e12), diverged: diverged ? 1 : 0, stepsTo, valley } as Metrics,
  };
}

export const descent2dModel: ExperimentModel = {
  id: "descent-2d",
  params: [
    { key: "surface", label: "地形", kind: "enum", options: SURFACES.map((s, i) => ({ value: i, label: s.name })), default: 0 },
    { key: "lr", label: "学习率 η", kind: "enum", options: LRS_2D.map((v) => ({ value: v, label: String(v) })), default: 0.1 },
    { key: "momentum", label: "动量", kind: "enum", options: MOMENTA.map((v) => ({ value: v, label: v === 0 ? "关" : String(v) })), default: 0 },
    { key: "x0", label: "起点 x", kind: "float", min: -3, max: 3, step: 0.1, default: -2.6 },
    { key: "y0", label: "起点 y", kind: "float", min: -3, max: 3, step: 0.1, default: 1.6 },
    { key: "steps", label: "已走步数", kind: "int", min: 0, max: MAX_STEPS_2D, step: 1, default: 0 },
  ],
  metrics: [
    { key: "loss", label: "当前损失", format: "error" },
    { key: "diverged", label: "是否发散", format: "number" },
    { key: "stepsTo", label: "到达谷底需要的步数", format: "number" },
    { key: "valley", label: "落进第几个谷", format: "number" },
  ],
  layers: ["trail"],
  presets: {
    article: { params: { surface: 0, lr: 0.1, momentum: 0, x0: -2.6, y0: 1.6, steps: 0 }, visibleControls: ["lr", "steps"], seed: 1 },
    valleys: { params: { surface: 1, lr: 0.1, momentum: 0, x0: 0.4, y0: 2.2, steps: 0 }, visibleControls: ["x0", "y0", "steps"], seed: 1 },
    lab: { params: { surface: 0, lr: 0.1, momentum: 0, x0: -2.6, y0: 1.6, steps: 0 }, seed: 1 },
  },
  compute(params) {
    return solveDescent2d({ ...defaultParams(descent2dModel), ...params }).metrics;
  },
  sweep(params, key) {
    const spec = descent2dModel.params.find((p) => p.key === key);
    if (!spec || spec.kind === "bool") throw new Error(`descent-2d 不能扫描参数 ${key}`);
    const values = spec.kind === "enum" ? spec.options.map((o) => o.value) : Array.from({ length: Math.round((spec.max - spec.min) / spec.step) + 1 }, (_, i) => +(spec.min + i * spec.step).toFixed(10));
    return values.map((value) => ({ value, metrics: descent2dModel.compute({ ...params, [key]: value }, 0) }));
  },
};
