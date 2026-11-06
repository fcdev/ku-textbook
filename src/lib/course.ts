import { closure, topoSort, type Graph, type GraphNode } from "./graph";
import type { LessonInput, LessonKu } from "./lesson-plan";
import type { Course } from "./teacher-types";

export interface CourseItem {
  id: string;
  /** 不是老师选的，是自动补充的前置 */
  auto: boolean;
  learned: boolean;
}

/** 组课 = topoSort(closure(selected))；不在 selected 里的标“自动补充前置”（SPEC §6.1）。 */
export function courseItems(g: Graph<GraphNode>, kuIds: string[], learnedKuIds: string[]): CourseItem[] {
  const known = kuIds.filter((id) => g.byId.has(id));
  const sel = new Set(known);
  const learned = new Set(learnedKuIds);
  return topoSort(g, closure(g, known)).map((id) => ({ id, auto: !sel.has(id), learned: learned.has(id) }));
}

/** 教案输入：课程里未标“已学”、且已经上线的 KU。 */
export function lessonInput(
  g: Graph<GraphNode & { title: string }>,
  course: Pick<Course, "title" | "kuIds" | "learnedKuIds" | "stage" | "periods" | "subject">,
  lessonKus: Record<string, LessonKu>,
): LessonInput {
  const items = courseItems(g, course.kuIds, course.learnedKuIds);
  return {
    courseTitle: course.title,
    kus: items.filter((i) => !i.learned && lessonKus[i.id]).map((i) => lessonKus[i.id]),
    learned: items.filter((i) => i.learned).map((i) => g.byId.get(i.id)!.title),
    stage: course.stage,
    periods: course.periods,
    subject: course.subject,
  };
}
