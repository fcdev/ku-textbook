import { describe, expect, it } from "vitest";
import { leastSquares, lineFitModel, makeLineData, TRUE_INTERCEPT, TRUE_SLOPE } from "./model";

const P = (o: Record<string, number | boolean> = {}) => ({ slope: 0, intercept: 0, n: 10, noise: 0.15, squares: false, ...o });

describe("line-fit", () => {
  it("确定性", () => {
    expect(lineFitModel.compute(P({ slope: 0.5 }), 3)).toEqual(lineFitModel.compute(P({ slope: 0.5 }), 3));
  });
  it("无噪声时最小二乘还原真实直线", () => {
    const d = makeLineData(10, 0, 3);
    const b = leastSquares(d.xs, d.ys);
    expect(b.slope).toBeCloseTo(TRUE_SLOPE, 9);
    expect(b.intercept).toBeCloseTo(TRUE_INTERCEPT, 9);
  });
  it("在最小二乘解处 gap = 0，其他地方 gap > 0", () => {
    const d = makeLineData(10, 0.15, 3);
    const b = leastSquares(d.xs, d.ys);
    expect(lineFitModel.compute(P(b), 3).gap).toBeCloseTo(0, 12);
    expect(lineFitModel.compute(P({ slope: b.slope + 0.2, intercept: b.intercept }), 3).gap).toBeGreaterThan(0);
  });
  it("MSE 关于斜率是开口向上的抛物线（扫描结果先降后升）", () => {
    const s = lineFitModel.sweep!(P({ intercept: 0.2 }), "slope", 3).map((p) => p.metrics.mse);
    const i = s.indexOf(Math.min(...s));
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(s.length - 1);
    for (let k = 1; k <= i; k++) expect(s[k]).toBeLessThanOrEqual(s[k - 1]);
    for (let k = i + 1; k < s.length; k++) expect(s[k]).toBeGreaterThanOrEqual(s[k - 1]);
  });
  it("闯关题可达成：滑块步长 0.05 能让 gap < 0.01", () => {
    const d = makeLineData(10, 0.15, 3);
    const b = leastSquares(d.xs, d.ys);
    const r = (v: number) => Math.round(v / 0.05) * 0.05;
    expect(lineFitModel.compute(P({ slope: r(b.slope), intercept: r(b.intercept) }), 3).gap).toBeLessThan(0.01);
  });
});
