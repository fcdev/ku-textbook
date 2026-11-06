import { getContent, toMeta } from "@/lib/content";
import { lessonKuMap } from "@/lib/lesson-data";
import type { TeacherContent } from "./api";

/** 构建期：教师端页面需要的 KU 数据（不含正文）。 */
export function teacherContent(): TeacherContent {
  const { kus } = getContent();
  const present: TeacherContent["present"] = {};
  for (const k of kus) {
    const m = k.body.match(/<Experiment\s+id="([^"]+)"(?:\s+preset="([^"]+)")?/);
    if (k.status !== "planned" && m) present[k.id] = { experiment: m[1], preset: m[2] ?? "article" };
  }
  return { kus: kus.map(toMeta), lessonKus: lessonKuMap(kus), present };
}
