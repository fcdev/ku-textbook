/** 纯数值工具：无 DOM、无副作用，可在服务端、客户端和单测里共用。 */

/** mulberry32：带 seed 的 PRNG，同样的 seed 产生同样的序列。 */
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller 标准正态采样。 */
export function gauss(rand: () => number): number {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Horner 法求多项式值，w[i] 是 x^i 的系数。 */
export function evalPoly(w: ArrayLike<number>, x: number): number {
  let s = 0;
  for (let i = w.length - 1; i >= 0; i--) s = s * x + w[i];
  return s;
}

/**
 * 多项式最小二乘（带岭项）：正规方程 + 部分主元高斯消元。
 * 约定 x 已经归一化到 [-1, 1]。λ 按样本数缩放，不惩罚常数项。
 */
export function fitPoly(xs: ArrayLike<number>, ys: ArrayLike<number>, degree: number, lambda = 0): Float64Array {
  const m = degree + 1;
  const A: Float64Array[] = Array.from({ length: m }, () => new Float64Array(m));
  const b = new Float64Array(m);
  const p = new Float64Array(m);
  for (let k = 0; k < xs.length; k++) {
    p[0] = 1;
    for (let i = 1; i < m; i++) p[i] = p[i - 1] * xs[k];
    for (let i = 0; i < m; i++) {
      b[i] += p[i] * ys[k];
      const row = A[i];
      for (let j = 0; j < m; j++) row[j] += p[i] * p[j];
    }
  }
  const reg = Math.max(lambda, 1e-10) * Math.max(1, xs.length);
  for (let i = 1; i < m; i++) A[i][i] += reg;
  A[0][0] += 1e-12;
  return solveInPlace(A, b);
}

/** 部分主元高斯消元，会改写 A 和 b。 */
export function solveInPlace(A: Float64Array[], b: Float64Array): Float64Array {
  const m = b.length;
  for (let i = 0; i < m; i++) {
    let piv = i;
    for (let j = i + 1; j < m; j++) if (Math.abs(A[j][i]) > Math.abs(A[piv][i])) piv = j;
    if (piv !== i) {
      [A[i], A[piv]] = [A[piv], A[i]];
      const t = b[i];
      b[i] = b[piv];
      b[piv] = t;
    }
    for (let j = i + 1; j < m; j++) {
      const f = A[j][i] / A[i][i];
      if (f === 0) continue;
      for (let k = i; k < m; k++) A[j][k] -= f * A[i][k];
      b[j] -= f * b[i];
    }
  }
  const w = new Float64Array(m);
  for (let i = m - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < m; j++) s -= A[i][j] * w[j];
    w[i] = s / A[i][i];
  }
  return w;
}

/** 均方误差。 */
export function mse(w: ArrayLike<number>, xs: ArrayLike<number>, ys: ArrayLike<number>): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    const e = evalPoly(w, xs[i]) - ys[i];
    s += e * e;
  }
  return s / xs.length;
}

/** 误差读数格式：数字宽度尽量稳定。 */
export function formatError(v: number): string {
  if (!Number.isFinite(v)) return "∞";
  if (v >= 100) return v.toExponential(1);
  if (v >= 1) return v.toFixed(2);
  return v.toFixed(3);
}
