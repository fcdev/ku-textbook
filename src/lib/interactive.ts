/**
 * 文章里的联动交互（纯函数，无 React）：正文可拖数字 <Knob>、滚动联动 <Stage set>、预测门槛 <Predict>、画出你的预测 <DrawIt>。
 *
 * 作者写法（MDX 只允许字符串属性）：
 *   <Experiment id="poly-fit" preset="article" ch="fit" />
 *   现在是 <Knob ch="fit" name="degree" /> 阶。
 *   <Stage label="9 阶以上" ch="fit" set="degree=10">…</Stage>
 *   <Predict id="p1" ch="fit" gate question="…" options="A|B|C" answer="2">掀开后的解释</Predict>
 *   <DrawIt id="u" exp="poly-fit" preset="lab" over="degree" metric="testMSE" log question="…">解释</DrawIt>
 *
 * 编译前 preprocessInteractive 把 ch="fit" 改写成 ch="<KU id>/fit"，并补上实验 id 和 preset，
 * 这样 <Knob> 在实验组件懒加载完成之前也知道自己的取值范围，不同 KU 的同名通道也不会串。
 */
import type { ExperimentModel, Params, ParamSpec } from "@/experiments/types";

export interface ChannelDecl { ch: string; exp: string; preset: string }

const attr = (tag: string, name: string): string | undefined => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const hasFlag = (tag: string, name: string) => new RegExp(`\\s${name}(?=[\\s/>])`).test(tag) || attr(tag, name) !== undefined;

export function tags(src: string, name: string): string[] {
  return [...src.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))].map((m) => m[0]);
}

/** 正文里声明了通道的实验。 */
export function channelDecls(src: string): ChannelDecl[] {
  return tags(src, "Experiment").flatMap((t) => {
    const ch = attr(t, "ch");
    return ch ? [{ ch, exp: attr(t, "id") ?? "", preset: attr(t, "preset") ?? "article" }] : [];
  });
}

/** "degree=1; n=10" → { degree: 1, n: 10 }；"true"/"false" 转成布尔。 */
export function parseSet(s: string): Params {
  const out: Params = {};
  for (const part of s.split(/[;,]/)) {
    const [k, v] = part.split("=").map((x) => x?.trim());
    if (!k || v === undefined || v === "") continue;
    out[k] = v === "true" ? true : v === "false" ? false : Number(v);
  }
  return out;
}

/** 按 "|" 拆选项。 */
export const parseOptions = (s: string | undefined) => (s ?? "").split("|").map((x) => x.trim()).filter(Boolean);

export function preprocessInteractive(src: string, kuId: string): string {
  const decls = new Map(channelDecls(src).map((d) => [d.ch, d]));
  return src.replace(/<(Experiment|Knob|Stage|Predict)\b([^>]*?)\bch="([^"]+)"/g, (whole, tag: string, mid: string, ch: string) => {
    const d = decls.get(ch);
    if (!d) return whole;
    const extra = tag === "Experiment" ? "" : ` exp="${d.exp}" preset="${d.preset}"`;
    return `<${tag}${mid}ch="${kuId}/${ch}"${extra}`;
  });
}

/** 某个参数值是否合法（Stage set、Knob 用）。 */
export function validValue(spec: ParamSpec, v: number | boolean): boolean {
  if (spec.kind === "bool") return typeof v === "boolean";
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  if (spec.kind === "enum") return spec.options.some((o) => o.value === v);
  return v >= spec.min - 1e-9 && v <= spec.max + 1e-9;
}

/** ku-lint 用：检查正文里联动组件的引用。返回错误信息列表。 */
export function lintInteractive(src: string, models: Record<string, ExperimentModel>): string[] {
  const errs: string[] = [];
  const decls = channelDecls(src);
  const byCh = new Map<string, ChannelDecl>();
  for (const d of decls) {
    if (byCh.has(d.ch)) errs.push(`实验通道 ch="${d.ch}" 声明了两次`);
    byCh.set(d.ch, d);
  }
  const chOf = (t: string, kind: string) => {
    const ch = attr(t, "ch");
    if (!ch) return undefined;
    const d = byCh.get(ch);
    if (!d) errs.push(`<${kind}> 引用了不存在的实验通道 ch="${ch}"（要在 <Experiment ch="${ch}"> 上声明）`);
    return d ? models[d.exp] : undefined;
  };

  for (const t of tags(src, "Knob")) {
    const m = chOf(t, "Knob");
    const name = attr(t, "name");
    if (!attr(t, "ch")) errs.push("<Knob> 缺少 ch");
    if (!name) errs.push("<Knob> 缺少 name");
    else if (m && !m.params.some((p) => p.key === name)) errs.push(`<Knob name="${name}">：实验「${m.id}」没有这个参数`);
  }
  for (const t of tags(src, "Stage")) {
    const set = attr(t, "set");
    if (set === undefined) continue;
    if (!attr(t, "ch")) { errs.push(`<Stage set="${set}"> 缺少 ch`); continue; }
    const m = chOf(t, "Stage");
    if (!m) continue;
    const params = parseSet(set);
    if (Object.keys(params).length === 0) errs.push(`<Stage set="${set}"> 写法不对，应为 "参数=值; 参数=值"`);
    for (const [k, v] of Object.entries(params)) {
      const spec = m.params.find((p) => p.key === k);
      if (!spec) errs.push(`<Stage set>：实验「${m.id}」没有参数「${k}」`);
      else if (!validValue(spec, v)) errs.push(`<Stage set>：参数「${k}」的值 ${v} 超出范围或不在选项里`);
    }
  }
  const ids = new Set<string>();
  for (const [kind, t] of [...tags(src, "Predict").map((t) => ["Predict", t] as const), ...tags(src, "DrawIt").map((t) => ["DrawIt", t] as const)]) {
    const id = attr(t, "id");
    if (!id) errs.push(`<${kind}> 缺少 id`);
    else if (ids.has(id)) errs.push(`<${kind} id="${id}"> 重复`);
    else ids.add(id);
    if (!attr(t, "question")) errs.push(`<${kind}${id ? ` id="${id}"` : ""}> 缺少 question`);
  }
  for (const t of tags(src, "Predict")) {
    if (attr(t, "ch")) chOf(t, "Predict");
    if (hasFlag(t, "gate") && !attr(t, "ch")) errs.push("<Predict gate> 需要 ch 指明锁住哪个实验");
    const opts = parseOptions(attr(t, "options"));
    if (opts.length < 2) errs.push(`<Predict id="${attr(t, "id")}"> 至少要 2 个选项（用 | 分隔）`);
    const a = attr(t, "answer");
    if (a !== undefined && !(Number.isInteger(Number(a)) && Number(a) >= 0 && Number(a) < opts.length)) errs.push(`<Predict id="${attr(t, "id")}"> answer 超出选项范围`);
  }
  for (const t of tags(src, "DrawIt")) {
    const exp = attr(t, "exp"), over = attr(t, "over"), metric = attr(t, "metric"), preset = attr(t, "preset") ?? "lab";
    const m = exp ? models[exp] : undefined;
    if (!m) { errs.push(`<DrawIt> 引用了不存在的实验「${exp}」`); continue; }
    if (!m.sweep) errs.push(`<DrawIt>：实验「${m.id}」没有 sweep`);
    if (!m.presets[preset]) errs.push(`<DrawIt>：实验「${m.id}」没有 preset「${preset}」`);
    if (!m.params.some((p) => p.key === over)) errs.push(`<DrawIt>：实验「${m.id}」没有参数「${over}」`);
    if (!m.metrics.some((x) => x.key === metric)) errs.push(`<DrawIt>：实验「${m.id}」没有指标「${metric}」`);
    const also = attr(t, "also");
    if (also && !m.metrics.some((x) => x.key === also)) errs.push(`<DrawIt>：实验「${m.id}」没有指标「${also}」`);
  }
  return errs;
}

export { attr as tagAttr, hasFlag };
