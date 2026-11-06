import { json, readJson, withTeacher } from "@/server/http";
import { createCourse, listCourses, sanitizePatch } from "@/server/courses";

export const dynamic = "force-dynamic";
export async function GET() {
  return withTeacher(async (t) => json({ courses: await listCourses(t.id) }));
}
export async function POST(req: Request) {
  const body = await readJson(req);
  return withTeacher(async (t) => json({ course: await createCourse(t.id, sanitizePatch(body)) }, 201));
}
