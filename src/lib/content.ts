/** 读取并校验 content/ku 下的 KU。只在服务端 / 构建期 / 脚本里用。 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import { frontmatterSchema, quizSchema, type KuFrontmatter, type Question } from "./schema";
import { buildGraph, type Graph } from "./graph";

export const CONTENT_DIR = path.join(process.cwd(), "content", "ku");

export interface Ku extends KuFrontmatter {
  /** MDX 正文（未编译） */
  body: string;
  quiz: Question[];
  dir: string;
}

export class ContentError extends Error {
  constructor(public readonly file: string, message: string) {
    super(`${path.relative(process.cwd(), file)}: ${message}`);
    this.name = "ContentError";
  }
}

export function readKu(dir: string): Ku {
  const file = path.join(dir, "index.mdx");
  if (!fs.existsSync(file)) throw new ContentError(dir, "缺少 index.mdx");
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const fm = frontmatterSchema.safeParse(data);
  if (!fm.success) throw new ContentError(file, fm.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("；"));
  const quizFile = path.join(dir, "quiz.yaml");
  let quiz: Question[] = [];
  if (fs.existsSync(quizFile)) {
    const q = quizSchema.safeParse(YAML.parse(fs.readFileSync(quizFile, "utf8")));
    if (!q.success) throw new ContentError(quizFile, q.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("；"));
    quiz = q.data;
  }
  return { ...fm.data, body: content, quiz, dir };
}

/** 读取全部 KU，按目录名排序后再按 §9 的 order.yaml（若有）排序。 */
export function readAllKus(root = CONTENT_DIR): Ku[] {
  const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const orderFile = path.join(root, "order.yaml");
  const order: string[] = fs.existsSync(orderFile) ? YAML.parse(fs.readFileSync(orderFile, "utf8")) : [];
  const rank = (id: string) => (order.indexOf(id) < 0 ? Infinity : order.indexOf(id));
  dirs.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return dirs.map((d) => readKu(path.join(root, d)));
}

let cached: { kus: Ku[]; graph: Graph<Ku> } | null = null;

/** 构建期缓存：全部 KU + 图（会校验前置和环）。 */
export function getContent() {
  if (!cached || process.env.NODE_ENV === "development") {
    const kus = readAllKus();
    cached = { kus, graph: buildGraph(kus) };
  }
  return cached;
}

export function getKu(id: string): Ku | undefined {
  return getContent().graph.byId.get(id);
}

/** 给客户端用的精简数据（不带正文）。 */
export interface KuMeta {
  id: string;
  title: string;
  summary?: string;
  prerequisites: string[];
  status: KuFrontmatter["status"];
  chapter?: number;
  estMinutes?: number;
  experiment?: string;
}

export function toMeta(k: Ku): KuMeta {
  return {
    id: k.id,
    title: k.title,
    summary: k.summary,
    prerequisites: k.prerequisites,
    status: k.status,
    chapter: k.chapter,
    estMinutes: k.estMinutes,
    experiment: k.experiment,
  };
}

/** 直觉层纯文本，用于搜索索引和教案 prompt。 */
export function intuitionText(k: Ku): string {
  const m = k.body.match(/<Intuition>([\s\S]*?)<\/Intuition>/);
  return (m ? m[1] : "")
    .replace(/^#{1,6}\s.*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*`$]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
