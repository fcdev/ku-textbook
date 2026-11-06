import { describe, expect, it } from "vitest";
import { descent1dModel, trajectory, W_STAR } from "./model";

const P = (o: Record<string, number> = {}) => ({ lr: 0.1, w0: -1.5, steps: 0, ...o });

describe("descent-1d", () => {
  it("0 步时停在起点", () => {
    expect(descent1dModel.compute(P(), 0).w).toBe(-1.5);
  });
  it("小学习率单调逼近最低点", () => {
    const ws = trajectory(-1.5, 0.1, 30);
    for (let i = 1; i < ws.length; i++) expect(Math.abs(ws[i] - W_STAR)).toBeLessThan(Math.abs(ws[i - 1] - W_STAR));
    expect(descent1dModel.compute(P({ steps: 30 }), 0).dist).toBeLessThan(0.01);
  });
  it("η = 0.5 一步到位", () => {
    expect(descent1dModel.compute(P({ lr: 0.5, steps: 1 }), 0).dist).toBeCloseTo(0, 12);
  });
  it("0.5 < η < 1 时来回震荡但收敛", () => {
    const ws = trajectory(-1.5, 0.9, 40);
    expect(Math.sign(ws[1] - W_STAR)).not.toBe(Math.sign(ws[0] - W_STAR));
    expect(Math.abs(ws[40] - W_STAR)).toBeLessThan(0.1);
  });
  it("η = 1 原地来回跳，η > 1 发散", () => {
    expect(descent1dModel.compute(P({ lr: 1, steps: 20 }), 0).dist).toBeCloseTo(2.5, 9);
    const m = descent1dModel.compute(P({ lr: 1.1, steps: 60 }), 0);
    expect(m.diverged).toBe(1);
  });
  it("stepsTo：学习率越接近 0.5，用的步数越少", () => {
    const s = (lr: number) => descent1dModel.compute(P({ lr, steps: 0 }), 0).stepsTo;
    expect(s(0.3)).toBeLessThan(s(0.1));
    expect(s(0.5)).toBe(1);
    expect(s(0.01)).toBe(-1);
  });
});
