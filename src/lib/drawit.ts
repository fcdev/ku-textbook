/** “画出你的预测”的打分（纯函数，单测覆盖）。 */

/** 把稀疏的手绘点补齐：中间线性插值，两端用最近的值延伸。全空返回 null。 */
export function fillGuess(g: (number | null)[]): number[] | null {
  const known = g.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
  if (known.length === 0) return null;
  return g.map((v, i) => {
    if (v !== null) return v;
    const left = [...known].reverse().find((k) => k < i);
    const right = known.find((k) => k > i);
    if (left === undefined) return g[right!]!;
    if (right === undefined) return g[left]!;
    const t = (i - left) / (right - left);
    return g[left]! + t * (g[right]! - g[left]!);
  });
}

export const coverage = (g: (number | null)[]) => g.filter((v) => v !== null).length / Math.max(1, g.length);

export const argmin = (a: number[]) => a.reduce((b, v, i) => (v < a[b] ? i : b), 0);

export interface DrawScore {
  /** 0–100，按纵轴范围归一化后的平均偏差换算 */
  score: number;
  guessMin: number;
  actualMin: number;
  /** 实际曲线的最低点在中间（U 形）而不是两端 */
  actualHasValley: boolean;
  /** 趋势（首尾升降）是否一致 */
  trendRight: boolean;
}

export function scoreDrawing(guess: number[], actual: number[], yRange: number): DrawScore {
  const n = Math.min(guess.length, actual.length);
  let err = 0;
  for (let i = 0; i < n; i++) err += Math.abs(guess[i] - actual[i]);
  const mae = err / Math.max(1, n) / Math.max(1e-9, yRange);
  const score = Math.round(Math.max(0, Math.min(100, 100 * (1 - mae * 2.5))));
  const actualMin = argmin(actual);
  const sign = (a: number[]) => Math.sign(a[a.length - 1] - a[0]);
  return {
    score,
    guessMin: argmin(guess),
    actualMin,
    actualHasValley: actualMin > 0 && actualMin < actual.length - 1,
    trendRight: sign(guess) === sign(actual),
  };
}
