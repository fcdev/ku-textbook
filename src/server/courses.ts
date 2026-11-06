import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { STAGES, SUBJECTS, type Course, type CoursePatch, type Plan } from "@/lib/teacher-types";

type CourseRow = typeof schema.courses.$inferSelect;
type PlanRow = typeof schema.lessonPlans.$inferSelect;

export const toCourse = (r: CourseRow): Course => ({
  id: r.id, title: r.title, kuIds: r.kuIds, learnedKuIds: r.learnedKuIds,
  stage: r.stage as Course["stage"], periods: r.periods, subject: r.subject as Course["subject"], updatedAt: r.updatedAt.toISOString(),
});
export const toPlan = (r: PlanRow): Plan => ({
  id: r.id, courseId: r.courseId, contentMd: r.contentMd, model: r.model, promptVersion: r.promptVersion,
  createdAt: r.createdAt.toISOString(), editedAt: r.editedAt?.toISOString() ?? null,
});

export function sanitizePatch(p: unknown): CoursePatch {
  const o = (p ?? {}) as Record<string, unknown>;
  const out: CoursePatch = {};
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^[a-z0-9-]{1,64}$/.test(x)).slice(0, 200) : undefined);
  if (typeof o.title === "string") out.title = o.title.trim().slice(0, 100) || "未命名课程";
  if (ids(o.kuIds)) out.kuIds = ids(o.kuIds);
  if (ids(o.learnedKuIds)) out.learnedKuIds = ids(o.learnedKuIds);
  if (STAGES.includes(o.stage as never)) out.stage = o.stage as Course["stage"];
  if (SUBJECTS.includes(o.subject as never)) out.subject = o.subject as Course["subject"];
  if (o.periods === 1 || o.periods === 2) out.periods = o.periods;
  return out;
}

export async function listCourses(teacherId: string) {
  const db = await getDb();
  return (await db.select().from(schema.courses).where(eq(schema.courses.teacherId, teacherId)).orderBy(desc(schema.courses.updatedAt))).map(toCourse);
}

export async function getCourse(teacherId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [r] = await db.select().from(schema.courses).where(and(eq(schema.courses.id, id), eq(schema.courses.teacherId, teacherId))).limit(1);
  return r ? toCourse(r) : null;
}

export async function createCourse(teacherId: string, patch: CoursePatch) {
  const db = await getDb();
  const [r] = await db.insert(schema.courses).values({ teacherId, title: patch.title ?? "新课程", ...patch }).returning();
  return toCourse(r);
}

export async function updateCourse(teacherId: string, id: string, patch: CoursePatch) {
  if (!(await getCourse(teacherId, id))) return null;
  const db = await getDb();
  const [r] = await db.update(schema.courses).set({ ...patch, updatedAt: new Date() }).where(eq(schema.courses.id, id)).returning();
  return toCourse(r);
}

export async function deleteCourse(teacherId: string, id: string) {
  if (!(await getCourse(teacherId, id))) return false;
  const db = await getDb();
  await db.delete(schema.courses).where(eq(schema.courses.id, id));
  return true;
}

export async function latestPlan(courseId: string) {
  const db = await getDb();
  const [r] = await db.select().from(schema.lessonPlans).where(eq(schema.lessonPlans.courseId, courseId)).orderBy(desc(schema.lessonPlans.createdAt)).limit(1);
  return r ? toPlan(r) : null;
}

export async function insertPlan(courseId: string, contentMd: string, model: string, promptVersion: string) {
  const db = await getDb();
  const [r] = await db.insert(schema.lessonPlans).values({ courseId, contentMd, model, promptVersion }).returning();
  return toPlan(r);
}

export async function saveEditedPlan(courseId: string, contentMd: string) {
  const latest = await latestPlan(courseId);
  if (!latest) return null;
  const db = await getDb();
  const [r] = await db.update(schema.lessonPlans).set({ contentMd: contentMd.slice(0, 100_000), editedAt: new Date() }).where(eq(schema.lessonPlans.id, latest.id)).returning();
  return toPlan(r);
}
