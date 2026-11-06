/** 等高线：marching squares。grid[j][i] 是 (x_i, y_j) 处的值，返回每条等高线的线段列表（数据坐标）。 */
export type Seg = [number, number, number, number];

export function contourSegments(grid: number[][], xs: number[], ys: number[], level: number): Seg[] {
  const segs: Seg[] = [];
  const lerp = (a: number, b: number, va: number, vb: number) => a + ((level - va) / (vb - va)) * (b - a);
  for (let j = 0; j < ys.length - 1; j++) {
    for (let i = 0; i < xs.length - 1; i++) {
      const v00 = grid[j][i], v10 = grid[j][i + 1], v01 = grid[j + 1][i], v11 = grid[j + 1][i + 1];
      const pts: [number, number][] = [];
      // 按 下 → 右 → 上 → 左 的顺序找穿过的边
      if ((v00 < level) !== (v10 < level)) pts.push([lerp(xs[i], xs[i + 1], v00, v10), ys[j]]);
      if ((v10 < level) !== (v11 < level)) pts.push([xs[i + 1], lerp(ys[j], ys[j + 1], v10, v11)]);
      if ((v01 < level) !== (v11 < level)) pts.push([lerp(xs[i], xs[i + 1], v01, v11), ys[j + 1]]);
      if ((v00 < level) !== (v01 < level)) pts.push([xs[i], lerp(ys[j], ys[j + 1], v00, v01)]);
      if (pts.length >= 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      if (pts.length === 4) segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
    }
  }
  return segs;
}

export function sampleGrid(f: (x: number, y: number) => number, box: [number, number, number, number], n: number) {
  const [x0, x1, y0, y1] = box;
  const xs = Array.from({ length: n }, (_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const ys = Array.from({ length: n }, (_, j) => y0 + ((y1 - y0) * j) / (n - 1));
  const grid = ys.map((y) => xs.map((x) => f(x, y)));
  return { xs, ys, grid };
}

/** 取若干个分位数作为等高线高度，保证各种地形都有均匀分布的线。 */
export function quantileLevels(grid: number[][], k: number): number[] {
  const all = grid.flat().sort((a, b) => a - b);
  return Array.from({ length: k }, (_, i) => all[Math.floor(((i + 0.5) / k) * 0.92 * (all.length - 1))]);
}
