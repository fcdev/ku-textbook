import { describe, expect, it } from "vitest";
import { descent2dModel, SURFACES, solveDescent2d, trajectory2d } from "./model";

const base = { surface: 0, lr: 0.1, momentum: 0, x0: -2.6, y0: 1.6, steps: 0 };

describe("descent-2d", () => {
  it("每个地形的梯度和数值导数一致", () => {
    for (const s of SURFACES) {
      for (const [x, y] of [[0.3, -0.7], [-1.2, 1.1], [1.5, 0.2]]) {
        const h = 1e-5;
        const [gx, gy] = s.grad(x, y);
        expect(gx).toBeCloseTo((s.loss(x + h, y) - s.loss(x - h, y)) / (2 * h), 3);
        expect(gy).toBeCloseTo((s.loss(x, y + h) - s.loss(x, y - h)) / (2 * h), 3);
      }
    }
  });
  it("标出的最小值处梯度接近 0", () => {
    for (const s of SURFACES) for (const [x, y] of s.minima) expect(Math.hypot(...s.grad(x, y))).toBeLessThan(0.05);
  });
  it("椭圆碗：学习率超过 2/8 = 0.25 发散，0.1 收敛", () => {
    expect(descent2dModel.compute({ ...base, lr: 0.1, steps: 120 }, 0).diverged).toBe(0);
    expect(descent2dModel.compute({ ...base, lr: 0.1 }, 0).stepsTo).toBeGreaterThan(0);
    expect(descent2dModel.compute({ ...base, lr: 0.26, steps: 120 }, 0).diverged).toBe(1);
  });
  it("两个山谷：起点决定落进哪个谷", () => {
    const left = descent2dModel.compute({ ...base, surface: 1, x0: -0.5, y0: 1 }, 0);
    const right = descent2dModel.compute({ ...base, surface: 1, x0: 0.5, y0: 1 }, 0);
    expect(left.valley).toBe(0);
    expect(right.valley).toBe(1);
  });
  it("弯曲峡谷：动量让它更快到达谷底", () => {
    const p = { ...base, surface: 2, x0: -1.5, y0: 2.5, lr: 0.02 };
    const plain = descent2dModel.compute({ ...p, momentum: 0 }, 0).stepsTo;
    const mom = descent2dModel.compute({ ...p, momentum: 0.9 }, 0).stepsTo;
    expect(mom).toBeGreaterThan(0);
    expect(plain === -1 || mom < plain).toBe(true);
  });
  it("轨迹长度 = 步数 + 1", () => {
    expect(trajectory2d(0, 0.1, 0, 1, 1, 7)).toHaveLength(8);
    expect(solveDescent2d({ ...base, steps: 5 }).pts).toHaveLength(6);
  });
});
