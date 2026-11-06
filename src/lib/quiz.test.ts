import { describe, expect, it } from "vitest";
import { polyFitModel } from "@/experiments/poly-fit/model";
import { defaultParams } from "@/experiments/types";
import { gradeCheck, gradeChoice } from "./quiz";
import { questionSchema } from "./schema";

const seed = 7;
const st = (degree: number) => {
  const params = { ...defaultParams(polyFitModel, "practice"), degree };
  return { params, metrics: polyFitModel.compute(params, seed) };
};

describe("gradeChoice", () => {
  const q = questionSchema.parse({ id: "q", type: "choice", prompt: "?", options: ["a", "b"], answer: 1 });
  it("比较下标", () => {
    if (q.type !== "choice") throw 0;
    expect(gradeChoice(q, 1)).toBe(true);
    expect(gradeChoice(q, 0)).toBe(false);
    expect(gradeChoice(q, null)).toBe(false);
  });
});

describe("gradeCheck", () => {
  it("比较运算", () => {
    const s = { params: {}, metrics: { m: 0.5 } };
    expect(gradeCheck({ metric: "m", op: "<", value: 1 }, s, polyFitModel, seed)).toBe(true);
    expect(gradeCheck({ metric: "m", op: ">=", value: 0.5 }, s, polyFitModel, seed)).toBe(true);
    expect(gradeCheck({ metric: "m", op: "between", value: [0.6, 1] }, s, polyFitModel, seed)).toBe(false);
    expect(gradeCheck({ metric: "nope", op: "<", value: 1 }, s, polyFitModel, seed)).toBe(false);
  });
  it("near-min：最优阶数附近算对，两端算错", () => {
    const check = { metric: "testMSE", op: "near-min" as const, over: "degree", tolerance: { steps: 1, ratio: 1.6 } };
    const sweep = polyFitModel.sweep!(st(1).params, "degree", seed);
    const best = sweep.reduce((a, b) => (b.metrics.testMSE < a.metrics.testMSE ? b : a)).value;
    expect(gradeCheck(check, st(best), polyFitModel, seed)).toBe(true);
    expect(gradeCheck(check, st(0), polyFitModel, seed)).toBe(false);
    expect(gradeCheck(check, st(12), polyFitModel, seed)).toBe(false);
  });
  it("判分在 50 ms 内", () => {
    const check = { metric: "testMSE", op: "near-min" as const, over: "degree", tolerance: { steps: 1, ratio: 1.6 } };
    const t0 = performance.now();
    gradeCheck(check, st(5), polyFitModel, seed);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
