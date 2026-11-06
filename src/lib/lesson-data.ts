import { experimentModels } from "@/experiments/models";
import { intuitionText, type Ku } from "./content";
import type { LessonKu } from "./lesson-plan";

/** 服务端 / 构建期：从 KU 内容整理出教案需要的数据。 */
export function toLessonKu(k: Ku): LessonKu {
  return {
    id: k.id,
    title: k.title,
    summary: k.summary ?? "",
    intuition: intuitionText(k).slice(0, 600),
    links: Object.fromEntries(Object.entries(k.links).map(([s, v]) => [s === "math" ? "math" : s === "physics" ? "physics" : s, v])),
    quiz: k.quiz.map((q) => ({ id: q.id, prompt: q.prompt })),
    hasExperiment: !!(k.experiment && experimentModels[k.experiment]),
    estMinutes: k.estMinutes ?? 0,
  };
}

export function lessonKuMap(kus: Ku[]): Record<string, LessonKu> {
  return Object.fromEntries(kus.filter((k) => k.status !== "planned").map((k) => [k.id, toLessonKu(k)]));
}
