import { describe, expect, it } from "vitest";
import { evalPoly, fitPoly, formatError, mse, mulberry32 } from "./numeric";

describe("mulberry32", () => {
  it("同一 seed 序列相同，且落在 [0,1)", () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("不同 seed 序列不同", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("evalPoly", () => {
  it("按 w[i]·x^i 求值", () => {
    expect(evalPoly([1, 2, 3], 2)).toBe(1 + 4 + 12);
    expect(evalPoly([], 5)).toBe(0);
  });
});

describe("fitPoly", () => {
  it("无噪声时还原二次多项式系数", () => {
    const xs = [-1, -0.5, 0, 0.3, 0.7, 1];
    const ys = xs.map((x) => 0.5 - x + 2 * x * x);
    const w = fitPoly(xs, ys, 2);
    expect(w[0]).toBeCloseTo(0.5, 6);
    expect(w[1]).toBeCloseTo(-1, 6);
    expect(w[2]).toBeCloseTo(2, 6);
  });
  it("阶数 = N−1 时穿过所有点", () => {
    const xs = [-0.9, -0.4, 0.1, 0.5, 0.95];
    const ys = [0.3, -0.2, 0.8, -0.5, 0.1];
    expect(mse(fitPoly(xs, ys, 4), xs, ys)).toBeLessThan(1e-12);
  });
  it("λ 越大，系数（不含常数项）范数越小", () => {
    const xs = [-0.9, -0.4, 0.1, 0.5, 0.95, 0.2, -0.1];
    const ys = [0.3, -0.2, 0.8, -0.5, 0.1, 0.4, 0.0];
    const norm = (w: Float64Array) => w.slice(1).reduce((s, v) => s + v * v, 0);
    expect(norm(fitPoly(xs, ys, 6, 0.1))).toBeLessThan(norm(fitPoly(xs, ys, 6, 0)));
  });
});

describe("formatError", () => {
  it("覆盖各数量级", () => {
    expect(formatError(Infinity)).toBe("∞");
    expect(formatError(0.01234)).toBe("0.012");
    expect(formatError(3.14159)).toBe("3.14");
    expect(formatError(1234)).toBe("1.2e+3");
  });
});
