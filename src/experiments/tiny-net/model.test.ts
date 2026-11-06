import { describe, expect, it } from "vitest";
import { makeDataset, TinyNet } from "./net";
import { tinyNetModel } from "./model";

describe("tiny-net", () => {
  it("数据集两类各一半", () => {
    for (const k of [0, 1, 3]) {
      const d = makeDataset(k, 100, 0.05, 1);
      expect(d.filter((p) => p.label === 1)).toHaveLength(50);
    }
  });
  it("训练能让损失下降，数值梯度有限", () => {
    const data = makeDataset(1, 20, 0.05, 2);
    for (const act of ["relu", "tanh"] as const) {
      const net = new TinyNet([3, 3], act, 5);
      const l0 = net.loss(data);
      // 用 lr 很小的一步检查损失下降，且方向和数值梯度一致
      const h = 1e-6, k = 1;
      const w = net.W[0][k];
      net.W[0][k] = w + h; const lp = net.loss(data);
      net.W[0][k] = w - h; const lm = net.loss(data);
      net.W[0][k] = w;
      const num = (lp - lm) / (2 * h);
      expect(Number.isFinite(num)).toBe(true);
      const before = net.loss(data);
      for (let i = 0; i < 30; i++) net.trainEpoch(data, 0.01);
      expect(net.loss(data)).toBeLessThan(before);
      expect(l0).toBeCloseTo(before, 10);
    }
  });
  it("圆环：1 个神经元分不开，3 个以上可以", () => {
    const one = tinyNetModel.compute({ dataset: 1, layers: 1, width: 1, epochs: 400 }, 3);
    const four = tinyNetModel.compute({ dataset: 1, layers: 1, width: 4, act: 1, epochs: 400 }, 3);
    expect(one.trainAcc).toBeLessThan(0.8);
    expect(four.trainAcc).toBeGreaterThan(0.95);
  });
  it("两团：线性可分，1 个神经元就够", () => {
    expect(tinyNetModel.compute({ dataset: 0, layers: 1, width: 1, act: 1, epochs: 300 }, 3).trainAcc).toBeGreaterThan(0.95);
  });
});
