import { describe, expect, it } from "vitest";
import { defaultParams } from "../types";
import { makeData, polyFitModel } from "./model";

const P = (o: Record<string, number> = {}) => ({ ...defaultParams(polyFitModel, "practice"), ...o });

describe("poly-fit", () => {
  it("同样的参数和 seed 得到同样的结果", () => {
    expect(polyFitModel.compute(P({ degree: 5 }), 7)).toEqual(polyFitModel.compute(P({ degree: 5 }), 7));
  });
  it("数据集由 seed 决定", () => {
    expect(Array.from(makeData(10, 0.2, 7).xs)).toEqual(Array.from(makeData(10, 0.2, 7).xs));
    expect(Array.from(makeData(10, 0.2, 7).xs)).not.toEqual(Array.from(makeData(10, 0.2, 8).xs));
  });
  it("训练误差随阶数单调不增（λ=0）", () => {
    const s = polyFitModel.sweep!(P(), "degree", 7);
    for (let i = 1; i < s.length; i++) expect(s[i].metrics.trainMSE).toBeLessThanOrEqual(s[i - 1].metrics.trainMSE + 1e-9);
  });
  it("阶数 ≥ N−1 时训练误差接近 0（闯关第 1 题可达成）", () => {
    expect(polyFitModel.compute(P({ degree: 9 }), 7).trainMSE).toBeLessThan(0.002);
  });
  it("测试误差呈 U 形：最小值在中间阶数", () => {
    const s = polyFitModel.sweep!(P(), "degree", 7);
    const best = s.reduce((a, b) => (b.metrics.testMSE < a.metrics.testMSE ? b : a));
    expect(best.value).toBeGreaterThanOrEqual(2);
    expect(best.value).toBeLessThanOrEqual(8);
    expect(s[s.length - 1].metrics.testMSE).toBeGreaterThan(best.metrics.testMSE * 2);
    expect(s[0].metrics.testMSE).toBeGreaterThan(best.metrics.testMSE);
  });
  it("高阶时加 λ 降低测试误差", () => {
    const base = P({ degree: 12, n: 12 });
    const no = polyFitModel.compute({ ...base, lambda: 0 }, 21).testMSE;
    const yes = polyFitModel.compute({ ...base, lambda: 1e-3 }, 21).testMSE;
    expect(yes).toBeLessThan(no);
  });
  it("单次计算足够快（< 8 ms，取 200 次平均）", () => {
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) polyFitModel.compute(P({ degree: (i % 13), n: 40 }), 7);
    expect((performance.now() - t0) / 200).toBeLessThan(8);
  });
});
