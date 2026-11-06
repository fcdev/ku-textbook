import { fail, json, readJson, withTeacher } from "@/server/http";
import { deleteCourse, getCourse, sanitizePatch, updateCourse } from "@/server/courses";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  return withTeacher(async (t) => {
    const c = await getCourse(t.id, id);
    return c ? json({ course: c }) : fail("课程不存在", 404);
  });
}
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(req);
  return withTeacher(async (t) => {
    const c = await updateCourse(t.id, id, sanitizePatch(body));
    return c ? json({ course: c }) : fail("课程不存在", 404);
  });
}
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  return withTeacher(async (t) => ((await deleteCourse(t.id, id)) ? json({ ok: true }) : fail("课程不存在", 404)));
}
