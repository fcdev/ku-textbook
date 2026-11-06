/**
 * 教案：输入整理、prompt 填充、结果校验、模板兜底。纯函数，服务端和演示模式（浏览器）共用。
 */
import type { Stage, Subject } from "./teacher-types";

export interface LessonKu {
  id: string;
  title: string;
  summary: string;
  intuition: string;
  links: Record<string, string[]>;
  quiz: { id: string; prompt: string }[];
  hasExperiment: boolean;
  estMinutes: number;
}

export interface LessonInput {
  courseTitle: string;
  kus: LessonKu[];
  learned: string[];
  stage: Stage;
  periods: number;
  subject: Subject;
}

export const MINUTES_PER_PERIOD = 45;

export function connectionHeading(subject: Subject): string {
  return subject === "无" ? "和其他课的连接" : `和${subject}课的连接`;
}

export function requiredSections(subject: Subject): string[] {
  return ["教学目标", "课前准备", "课堂流程", connectionHeading(subject), "随堂练习", "课后作业"];
}

/** 取出某个二级标题下的正文。 */
export function section(md: string, heading: string): string | null {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.replace(/\s+$/, "") === `## ${heading}`);
  if (i < 0) return null;
  const out: string[] = [];
  for (let j = i + 1; j < lines.length && !/^##\s/.test(lines[j]); j++) out.push(lines[j]);
  return out.join("\n");
}

/** 课堂流程里顶层列表项的分钟数：形如 “- **导入**（5 分钟）：…”。 */
export function flowMinutes(md: string): number[] {
  const body = section(md, "课堂流程") ?? "";
  return body
    .split("\n")
    .filter((l) => /^[-*]\s/.test(l))
    .map((l) => l.match(/[（(]\s*(\d+)\s*分钟\s*[）)]/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => Number(m[1]));
}

export function validatePlan(md: string, input: Pick<LessonInput, "subject" | "periods">): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const h of requiredSections(input.subject)) if (section(md, h) === null) errors.push(`缺少小节「${h}」`);
  const mins = flowMinutes(md);
  const total = MINUTES_PER_PERIOD * input.periods;
  const sum = mins.reduce((a, b) => a + b, 0);
  if (mins.length === 0) errors.push("课堂流程里没有带分钟数的环节");
  else if (sum !== total) errors.push(`课堂流程分钟数之和是 ${sum}，应为 ${total}`);
  return { ok: errors.length === 0, errors };
}

/** 把总分钟数尽量平均地分给 n 段，结果是整数，和不变。 */
export function splitMinutes(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => base + (i < total - base * n ? 1 : 0));
}

const stageWord = (s: Stage) => (s === "高中" ? "高中生" : "本科低年级学生");

/** 模板生成器：大模型不可用或两次输出都不合格时兜底，也是演示模式的生成器。 */
export function templatePlan(input: LessonInput): string {
  const total = MINUTES_PER_PERIOD * input.periods;
  const kus = input.kus;
  const intro = 5, wrap = 5, practice = kus.length ? Math.max(5, Math.round(total * 0.15)) : 0;
  const perKu = splitMinutes(total - intro - wrap - practice, Math.max(1, kus.length));
  const title = input.courseTitle || kus.map((k) => k.title).join("、") || "AI 通识课";
  const out: string[] = [];
  out.push(`# ${title}`, "");
  out.push(`> 面向${stageWord(input.stage)} · ${input.periods} 课时（${total} 分钟）${input.subject === "无" ? "" : ` · 融合${input.subject}`}`, "");

  out.push("## 教学目标", "");
  if (kus.length === 0) out.push("- 课程里还没有知识点，请先在组课页面选择。");
  for (const k of kus) out.push(`- 理解「${k.title}」：${k.summary}`);
  if (kus.some((k) => k.hasExperiment)) out.push("- 能通过动手调节实验参数，观察并描述现象，再用自己的话解释原因。");
  out.push("");

  out.push("## 课前准备", "");
  out.push("- 教室投影打开本站“投屏模式”，提前把本课的实验页面打开一遍。");
  out.push("- 学生用手机或电脑打开对应知识点页面（无需登录）。");
  if (input.learned.length) out.push(`- 学生已学过：${input.learned.join("、")}，可在导入环节快速回顾。`);
  out.push("");

  out.push("## 课堂流程", "");
  out.push(`- **导入**（${intro} 分钟）：用一个生活中的例子提出问题${kus[0] ? `，引出「${kus[0].title}」` : ""}。`);
  kus.forEach((k, i) => {
    const m = perKu[i];
    out.push(`- **${k.title}**（${m} 分钟）：${k.hasExperiment ? "教师投屏演示实验，学生在自己的设备上跟着拖动滑块；" : ""}${firstSentence(k.intuition)}`);
    out.push(`  - 核心一句话：${k.summary}`);
    out.push(k.hasExperiment ? "  - 讨论：先请学生预测拖动后会发生什么，再动手验证，最后用自己的话说出看到的现象。" : "  - 讨论：请学生举一个生活中的例子。");
  });
  if (kus.length === 0) out.push(`- **讲授与讨论**（${perKu[0]} 分钟）：根据选择的知识点展开。`);
  if (practice) out.push(`- **随堂练习**（${practice} 分钟）：学生在手机上完成闯关题，教师巡视，挑典型错误讲评。`);
  out.push(`- **小结**（${wrap} 分钟）：请两三位学生用一句话总结本课，教师补充，并预告下一节。`);
  out.push("");

  out.push(`## ${connectionHeading(input.subject)}`, "");
  const key = input.subject === "数学" ? "math" : input.subject === "物理" ? "physics" : "";
  let any = false;
  for (const k of kus) {
    const items = key ? k.links[key] ?? [] : Object.values(k.links).flat();
    if (items.length) { out.push(`- 「${k.title}」：${items.join("、")}`); any = true; }
  }
  if (!any) out.push("- 本课知识点和其他学科的连接还在整理中，可以请学生自己找找生活中的例子。");
  out.push("");

  out.push("## 随堂练习", "");
  // 每个知识点最多选 2 道，其余留给学生课后在闯关里做
  for (const k of kus) for (const q of k.quiz.slice(0, 2)) out.push(`- [${k.id}/${q.id}] ${q.prompt}`);
  if (!kus.some((k) => k.quiz.length)) out.push("- 暂无题目。");
  out.push("");

  out.push("## 课后作业", "");
  if (kus[0]) out.push(`- 在实验沙盒里自由探索「${kus[kus.length - 1].title}」，写下一个你发现的现象和你的解释（100 字以内）。`);
  out.push("- 找一个生活中的例子，说明本课的概念。", "");
  return out.join("\n");
}

function firstSentence(s: string): string {
  const m = s.match(/^[^。！？]*[。！？]/);
  return (m ? m[0] : s.slice(0, 60)).trim();
}

/** 填充 prompt 模板里的 {{占位符}}。 */
export function fillPrompt(template: string, input: LessonInput): string {
  const kuText = input.kus
    .map((k) => [
      `### ${k.title}（id: ${k.id}）`,
      `摘要：${k.summary}`,
      `直觉层：${k.intuition}`,
      `跨学科：${Object.entries(k.links).map(([s, v]) => `${s}: ${v.join("、")}`).join("；") || "无"}`,
      `有交互实验：${k.hasExperiment ? "是" : "否"}`,
      `题目：${k.quiz.map((q) => `[${k.id}/${q.id}] ${q.prompt}`).join("；") || "无"}`,
    ].join("\n"))
    .join("\n\n");
  const vars: Record<string, string> = {
    courseTitle: input.courseTitle,
    stage: stageWord(input.stage),
    periods: String(input.periods),
    totalMinutes: String(MINUTES_PER_PERIOD * input.periods),
    subject: input.subject,
    connectionHeading: connectionHeading(input.subject),
    learned: input.learned.join("、") || "无",
    kus: kuText || "（无）",
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

/** 解析 prompt 文件：frontmatter 里的 version + 正文。 */
export function parsePromptFile(src: string): { version: string; system: string; user: string } {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("prompt 文件缺少 frontmatter");
  const version = m[1].match(/version:\s*(\S+)/)?.[1];
  if (!version) throw new Error("prompt 文件缺少 version");
  const [system, user] = m[2].split(/^=== user ===$/m);
  return { version, system: system.replace(/^=== system ===\n/m, "").trim(), user: (user ?? "").trim() };
}
