import { gauss, mulberry32 } from "@/lib/numeric";
import { defaultParams, type ExperimentModel, type Metrics, type Params } from "../types";

/** 真实规律：y = 0.8x + 0.2，加噪声。 */
export const TRUE_SLOPE = 0.8;
export const TRUE_INTERCEPT = 0.2;

export function makeLineData(n: number, noise: number, seed: number) {
  const r = mulberry32(seed);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) xs[i] = -1 + 2 * r();
  xs.sort();
  for (let i = 0; i < n; i++) ys[i] = TRUE_SLOPE * xs[i] + TRUE_INTERCEPT + noise * gauss(r);
  return { xs, ys };
}

/** 一元最小二乘的闭式解。 */
export function leastSquares(xs: ArrayLike<number>, ys: ArrayLike<number>): { slope: number; intercept: number } {
  const n = xs.length;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; }
  const mx = sx / n, my = sy / n;
  let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

export function lineErrors(xs: ArrayLike<number>, ys: ArrayLike<number>, slope: number, intercept: number) {
  let se = 0, ae = 0;
  for (let i = 0; i < xs.length; i++) {
    const e = slope * xs[i] + intercept - ys[i];
    se += e * e;
    ae += Math.abs(e);
  }
  return { mse: se / xs.length, mae: ae / xs.length };
}

export function solveLine(params: Params, seed: number) {
  const data = makeLineData(Number(params.n), Number(params.noise), seed);
  const slope = Number(params.slope), intercept = Number(params.intercept);
  const { mse, mae } = lineErrors(data.xs, data.ys, slope, intercept);
  const best = leastSquares(data.xs, data.ys);
  const bestErr = lineErrors(data.xs, data.ys, best.slope, best.intercept);
  return { data, best, metrics: { mse, mae, gap: mse - bestErr.mse, bestMSE: bestErr.mse } as Metrics };
}

const range = (min: number, max: number, step: number) => {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
};

export const lineFitModel: ExperimentModel = {
  id: "line-fit",
  params: [
    { key: "slope", label: "斜率 k", kind: "float", min: -2, max: 2, step: 0.05, default: 0 },
    { key: "intercept", label: "截距 b", kind: "float", min: -1.5, max: 1.5, step: 0.05, default: 0 },
    { key: "n", label: "数据点数", kind: "int", min: 3, max: 30, step: 1, default: 10 },
    { key: "noise", label: "噪声", kind: "float", min: 0, max: 0.5, step: 0.01, default: 0.15 },
    { key: "squares", label: "画出误差平方", kind: "bool", default: false },
  ],
  metrics: [
    { key: "mse", label: "均方误差", format: "error" },
    { key: "mae", label: "平均绝对误差", format: "error" },
    { key: "gap", label: "离最优还差", format: "error" },
    { key: "bestMSE", label: "最小可能的均方误差", format: "error" },
  ],
  layers: ["residuals", "squares", "best", "points"],
  presets: {
    article: { params: { slope: 0, intercept: 0 }, visibleControls: ["slope", "intercept"], seed: 3 },
    "loss-article": { params: { slope: 0.3, intercept: -0.2, squares: true }, visibleControls: ["slope", "intercept"], seed: 3 },
    practice: { params: { slope: 0, intercept: 0 }, visibleControls: ["slope", "intercept"], seed: 3 },
    lab: { params: { slope: 0, intercept: 0 }, seed: 3 },
  },
  compute(params, seed) {
    return solveLine({ ...defaultParams(lineFitModel), ...params }, seed).metrics;
  },
  sweep(params, key, seed) {
    const spec = lineFitModel.params.find((p) => p.key === key);
    if (!spec || spec.kind === "bool" || spec.kind === "enum") throw new Error(`line-fit 不能扫描参数 ${key}`);
    return range(spec.min, spec.max, spec.step).map((value) => ({ value, metrics: lineFitModel.compute({ ...params, [key]: value }, seed) }));
  },
};
