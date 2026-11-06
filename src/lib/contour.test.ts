import { describe, expect, it } from "vitest";
import { contourSegments, quantileLevels, sampleGrid } from "./contour";

describe("contour", () => {
  it("圆的等高线上每个端点到圆心距离约等于半径", () => {
    const { xs, ys, grid } = sampleGrid((x, y) => x * x + y * y, [-2, 2, -2, 2], 41);
    const segs = contourSegments(grid, xs, ys, 1);
    expect(segs.length).toBeGreaterThan(20);
    for (const [a, b, c, d] of segs) {
      expect(Math.hypot(a, b)).toBeCloseTo(1, 1);
      expect(Math.hypot(c, d)).toBeCloseTo(1, 1);
    }
  });
  it("分位数等高线从低到高", () => {
    const { grid } = sampleGrid((x, y) => x * x + y * y, [-2, 2, -2, 2], 21);
    const lv = quantileLevels(grid, 8);
    expect(lv).toHaveLength(8);
    for (let i = 1; i < lv.length; i++) expect(lv[i]).toBeGreaterThanOrEqual(lv[i - 1]);
  });
});
