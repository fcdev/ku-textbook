import { evalPoly, fitPoly, gauss, mse, mulberry32 } from "@/lib/numeric";
import { defaultParams, type ExperimentModel, type Metrics, type Params } from "../types";

/** 真实规律：在 [-1, 1] 上有两个拐弯，低阶多项式拟合不了，高阶又容易过拟合。 */
export function truth(x: number): number {
  return 0.85 * Math.sin(2.7 * x) + 0.25 * x;
}

export interface Dataset {
  xs: Float64Array;
  ys: Float64Array;
}

export const TEST_SIZE = 40;
export const TEST_SEED_OFFSET = 1000;

export function makeData(n: number, noise: number, seed: number): Dataset {
  const r = mulberry32(seed);
  const xs = new Float64Array(n);
  for (let i = 0; i < n; i++) xs[i] = -1 + 2 * r();
  xs.sort();
  const ys = new Float64Array(n);
  for (let i = 0; i < n; i++) ys[i] = truth(xs[i]) + noise * gauss(r);
  return { xs, ys };
}

// 拖动滑块时数据集不变，缓存最近一次的数据，避免每帧重新采样。
let cacheKey = "";
let cache: { train: Dataset; test: Dataset } | null = null;
export function datasets(n: number, noise: number, seed: number) {
  const key = `${n}|${noise}|${seed}`;
  if (key !== cacheKey || !cache) {
    cache = { train: makeData(n, noise, seed), test: makeData(TEST_SIZE, noise, seed + TEST_SEED_OFFSET) };
    cacheKey = key;
  }
  return cache;
}

export const LAMBDAS = [0, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1];

export interface PolyFitResult extends Metrics {
  trainMSE: number;
  testMSE: number;
}

export function solve(params: Params, seed: number) {
  const degree = Number(params.degree);
  const n = Number(params.n);
  const noise = Number(params.noise);
  const lambda = Number(params.lambda);
  const { train, test } = datasets(n, noise, seed);
  const w = fitPoly(train.xs, train.ys, degree, lambda);
  return {
    w,
    train,
    test,
    metrics: { trainMSE: mse(w, train.xs, train.ys), testMSE: mse(w, test.xs, test.ys) } as PolyFitResult,
  };
}

export const polyFitModel: ExperimentModel = {
  id: "poly-fit",
  params: [
    { key: "degree", label: "阶数", kind: "int", min: 0, max: 12, step: 1, default: 1 },
    { key: "n", label: "训练点数", kind: "int", min: 5, max: 40, step: 1, default: 10 },
    { key: "noise", label: "噪声", kind: "float", min: 0, max: 0.5, step: 0.01, default: 0.2 },
    {
      key: "lambda",
      label: "正则化 λ",
      kind: "enum",
      options: LAMBDAS.map((v) => ({ value: v, label: v === 0 ? "关" : v.toExponential(0) })),
      default: 0,
    },
  ],
  metrics: [
    { key: "trainMSE", label: "训练误差", format: "error" },
    { key: "testMSE", label: "测试误差", format: "error" },
  ],
  layers: ["testPoints", "truth", "trainPoints", "model"],
  presets: {
    article: { params: { degree: 1, n: 10, noise: 0.2 }, visibleControls: ["degree"], seed: 7 },
    practice: { params: { degree: 1, n: 10, noise: 0.2 }, visibleControls: ["degree"], seed: 7 },
    lab: { params: { degree: 4, n: 12, noise: 0.2 }, seed: 21 },
    "l2-article": { params: { degree: 12, n: 12, noise: 0.2 }, visibleControls: ["lambda"], seed: 21 },
    "l2-practice": { params: { degree: 12, n: 12, noise: 0.2 }, visibleControls: ["lambda"], seed: 21 },
  },
  compute(params, seed) {
    return solve({ ...defaultParams(polyFitModel), ...params }, seed).metrics;
  },
  sweep(params, key, seed) {
    const spec = polyFitModel.params.find((p) => p.key === key);
    if (!spec) throw new Error(`poly-fit 没有参数 ${key}`);
    const values = spec.kind === "enum" ? spec.options.map((o) => o.value) : spec.kind === "bool" ? [0, 1] : range(spec.min, spec.max, spec.step);
    return values.map((value) => ({ value, metrics: polyFitModel.compute({ ...params, [key]: value }, seed) }));
  },
};

function range(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

export { evalPoly };
