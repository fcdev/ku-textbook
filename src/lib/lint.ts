import fs from "node:fs";
import path from "node:path";
import { experimentModels, plannedExperiments } from "@/experiments/models";
import { buildGraph, GraphError } from "./graph";
import { ContentError, readKu, type Ku } from "./content";

export interface LintIssue {
  level: "error" | "warn";
  where: string;
  message: string;
}

/** ku-lint 的全部检查。返回问题列表，不抛错。 */
export function lintContent(root: string): { kus: Ku[]; issues: LintIssue[] } {
  const issues: LintIssue[] = [];
  const err = (where: string, message: string) => issues.push({ level: "error", where, message });
  const warn = (where: string, message: string) => issues.push({ level: "warn", where, message });

  const kus: Ku[] = [];
  for (const d of fs.readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    try {
      const ku = readKu(path.join(root, d.name));
      if (ku.id !== d.name) err(d.name, `frontmatter id「${ku.id}」必须等于目录名「${d.name}」`);
      kus.push(ku);
    } catch (e) {
      err(d.name, e instanceof ContentError ? e.message : String(e));
    }
  }

  try {
    buildGraph(kus);
  } catch (e) {
    if (e instanceof GraphError) err(e.ids.join(","), e.message);
    else throw e;
  }

  for (const ku of kus) {
    const model = ku.experiment ? experimentModels[ku.experiment] : undefined;
    if (ku.experiment && !model) {
      if (ku.status === "planned" && plannedExperiments.has(ku.experiment)) {
        // 规划中的实验，允许
      } else err(ku.id, `实验「${ku.experiment}」不在 registry 里`);
    }
    if (ku.status !== "planned") {
      if (!/<Intuition>/.test(ku.body)) err(ku.id, "缺少 <Intuition> 直觉层");
      if (ku.status === "published" && ku.quiz.length < 3) err(ku.id, `已发布的 KU 至少要 3 道题（现在 ${ku.quiz.length} 道）`);
      if (!/<Theory>/.test(ku.body)) warn(ku.id, "还没有 <Theory> 原理层");
    }
    for (const m of ku.body.matchAll(/<Experiment\s+id="([^"]+)"(?:\s+preset="([^"]+)")?/g)) {
      const em = experimentModels[m[1]];
      if (!em) err(ku.id, `正文引用了不存在的实验「${m[1]}」`);
      else if (m[2] && !em.presets[m[2]]) err(ku.id, `实验「${m[1]}」没有 preset「${m[2]}」`);
    }
    for (const m of ku.body.matchAll(/<Formula>([\s\S]*?)<\/Formula>/g)) {
      if (m[1].includes('"')) err(ku.id, "<Formula> 里不能有英文双引号");
    }
    for (const q of ku.quiz) {
      const where = `${ku.id}/quiz.yaml#${q.id}`;
      if (q.type !== "experiment-target") continue;
      const em = experimentModels[q.experiment.id];
      if (!em) {
        err(where, `实验「${q.experiment.id}」不在 registry 里`);
        continue;
      }
      if (!em.presets[q.experiment.preset]) err(where, `实验「${em.id}」没有 preset「${q.experiment.preset}」`);
      if (!em.metrics.some((m) => m.key === q.check.metric)) err(where, `实验「${em.id}」没有指标「${q.check.metric}」`);
      for (const h of q.experiment.hide) if (!(em.layers ?? []).includes(h)) err(where, `实验「${em.id}」没有可隐藏的图层「${h}」`);
      if (q.check.op === "near-min" || q.check.op === "near-max") {
        if (!em.sweep) err(where, `实验「${em.id}」没有 sweep，不能用 ${q.check.op}`);
        if (!em.params.some((p) => p.key === (q.check as { over: string }).over)) err(where, `实验「${em.id}」没有参数「${(q.check as { over: string }).over}」`);
      }
    }
    for (const r of ku.reading) {
      if (r.title.length > 80) warn(ku.id, "延伸阅读只放书名、章节和链接，不放原文");
    }
  }
  return { kus, issues };
}
