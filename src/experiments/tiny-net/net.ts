/**
 * 浏览器里训练的小型全连接网络（纯 TypeScript，无依赖）：2 维输入 → 若干隐藏层 → 1 个 sigmoid 输出，
 * 交叉熵损失 + Adam，全批量训练。几百个点、几十个参数，一帧能跑好几轮。
 */
import { gauss, mulberry32 } from "@/lib/numeric";

export type Act = "relu" | "tanh";
export interface Point { x: number; y: number; label: 0 | 1 }

export class TinyNet {
  sizes: number[];
  W: Float64Array[];
  b: Float64Array[];
  private m: Float64Array[];
  private v: Float64Array[];
  private mb: Float64Array[];
  private vb: Float64Array[];
  private t = 0;
  epoch = 0;

  constructor(hidden: number[], public act: Act, seed: number) {
    this.sizes = [2, ...hidden, 1];
    const r = mulberry32(seed);
    this.W = []; this.b = [];
    for (let l = 0; l < this.sizes.length - 1; l++) {
      const nin = this.sizes[l], nout = this.sizes[l + 1];
      const scale = act === "relu" ? Math.sqrt(2 / nin) : Math.sqrt(1 / nin);
      this.W.push(Float64Array.from({ length: nin * nout }, () => gauss(r) * scale));
      this.b.push(new Float64Array(nout).fill(act === "relu" && l < this.sizes.length - 2 ? 0.05 : 0));
    }
    const z = (a: Float64Array[]) => a.map((x) => new Float64Array(x.length));
    this.m = z(this.W); this.v = z(this.W); this.mb = z(this.b); this.vb = z(this.b);
  }

  get paramCount() { return this.W.reduce((s, w) => s + w.length, 0) + this.b.reduce((s, b) => s + b.length, 0); }

  private f(z: number) { return this.act === "relu" ? (z > 0 ? z : 0) : Math.tanh(z); }
  private df(a: number) { return this.act === "relu" ? (a > 0 ? 1 : 0) : 1 - a * a; }

  /** 返回每层激活值（最后一层是概率）。 */
  forwardAll(x: number, y: number): Float64Array[] {
    const acts = [Float64Array.of(x, y)];
    for (let l = 0; l < this.W.length; l++) {
      const a = acts[l], nin = this.sizes[l], nout = this.sizes[l + 1], w = this.W[l];
      const out = new Float64Array(nout);
      for (let j = 0; j < nout; j++) {
        let s = this.b[l][j];
        for (let i = 0; i < nin; i++) s += w[j * nin + i] * a[i];
        out[j] = l === this.W.length - 1 ? 1 / (1 + Math.exp(-s)) : this.f(s);
      }
      acts.push(out);
    }
    return acts;
  }

  predict(x: number, y: number): number { const a = this.forwardAll(x, y); return a[a.length - 1][0]; }

  /** 全批量一轮：算梯度、Adam 更新，返回更新前的平均交叉熵。 */
  trainEpoch(data: Point[], lr: number): number {
    const gW = this.W.map((w) => new Float64Array(w.length));
    const gb = this.b.map((b) => new Float64Array(b.length));
    let loss = 0;
    for (const p of data) {
      const acts = this.forwardAll(p.x, p.y);
      const out = acts[acts.length - 1][0];
      loss += -(p.label ? Math.log(Math.max(out, 1e-12)) : Math.log(Math.max(1 - out, 1e-12)));
      let delta = Float64Array.of(out - p.label); // sigmoid + 交叉熵的梯度
      for (let l = this.W.length - 1; l >= 0; l--) {
        const a = acts[l], nin = this.sizes[l], nout = this.sizes[l + 1], w = this.W[l];
        const prev = new Float64Array(nin);
        for (let j = 0; j < nout; j++) {
          gb[l][j] += delta[j];
          for (let i = 0; i < nin; i++) { gW[l][j * nin + i] += delta[j] * a[i]; prev[i] += delta[j] * w[j * nin + i]; }
        }
        if (l > 0) for (let i = 0; i < nin; i++) prev[i] *= this.df(a[i]);
        delta = prev;
      }
    }
    const n = Math.max(1, data.length);
    this.t++;
    const b1 = 0.9, b2 = 0.999, eps = 1e-8, c1 = 1 - b1 ** this.t, c2 = 1 - b2 ** this.t;
    const step = (P: Float64Array, G: Float64Array, M: Float64Array, V: Float64Array) => {
      for (let k = 0; k < P.length; k++) {
        const g = G[k] / n;
        M[k] = b1 * M[k] + (1 - b1) * g;
        V[k] = b2 * V[k] + (1 - b2) * g * g;
        P[k] -= (lr * (M[k] / c1)) / (Math.sqrt(V[k] / c2) + eps);
      }
    };
    for (let l = 0; l < this.W.length; l++) { step(this.W[l], gW[l], this.m[l], this.v[l]); step(this.b[l], gb[l], this.mb[l], this.vb[l]); }
    this.epoch++;
    return loss / n;
  }

  loss(data: Point[]): number {
    let s = 0;
    for (const p of data) { const o = this.predict(p.x, p.y); s += -(p.label ? Math.log(Math.max(o, 1e-12)) : Math.log(Math.max(1 - o, 1e-12))); }
    return s / Math.max(1, data.length);
  }

  accuracy(data: Point[]): number {
    if (!data.length) return 0;
    return data.filter((p) => (this.predict(p.x, p.y) > 0.5 ? 1 : 0) === p.label).length / data.length;
  }
}

export const DATASETS = ["两团", "圆环", "异或", "螺旋"] as const;

/** 生成 [-1, 1]² 里的二分类数据，两类各一半。 */
export function makeDataset(kind: number, n: number, noise: number, seed: number): Point[] {
  const r = mulberry32(seed);
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    let label = (i % 2) as 0 | 1;
    let x: number, y: number;
    if (kind === 0) {
      const c = label ? 0.45 : -0.45;
      x = c + gauss(r) * 0.22; y = c + gauss(r) * 0.22;
    } else if (kind === 1) {
      const rad = label ? r() * 0.35 : 0.6 + r() * 0.3, th = r() * Math.PI * 2;
      x = rad * Math.cos(th); y = rad * Math.sin(th);
    } else if (kind === 2) {
      // 异或：一、三象限一类，二、四象限另一类；离坐标轴留一点缝
      x = (r() * 2 - 1) * 0.85; y = (r() * 2 - 1) * 0.85;
      x += 0.08 * Math.sign(x || 1); y += 0.08 * Math.sign(y || 1);
      label = x * y > 0 ? 1 : 0;
    } else {
      const t = r(), a = t * 3.2 * Math.PI + (label ? Math.PI : 0), rad = 0.12 + t * 0.78;
      x = rad * Math.cos(a); y = rad * Math.sin(a);
    }
    pts.push({ x: x + gauss(r) * noise, y: y + gauss(r) * noise, label });
  }
  return pts;
}
