export const STAGES = ["高中", "本科"] as const;
export const SUBJECTS = ["数学", "物理", "无"] as const;
export type Stage = (typeof STAGES)[number];
export type Subject = (typeof SUBJECTS)[number];

export interface Teacher { id: string; name: string; school: string; account: string }

export interface Course {
  id: string;
  title: string;
  kuIds: string[];
  learnedKuIds: string[];
  stage: Stage;
  periods: number;
  subject: Subject;
  updatedAt: string;
}

export interface Plan {
  id: string;
  courseId: string;
  contentMd: string;
  model: string;
  promptVersion: string;
  createdAt: string;
  editedAt: string | null;
}

export type CoursePatch = Partial<Pick<Course, "title" | "kuIds" | "learnedKuIds" | "stage" | "periods" | "subject">>;

/** 教案生成的流式事件（NDJSON，一行一个）。 */
export type PlanEvent =
  | { t: "delta"; text: string }
  | { t: "reset"; reason: string }
  | { t: "done"; plan: Plan; source: "llm" | "template" }
  | { t: "error"; message: string };
