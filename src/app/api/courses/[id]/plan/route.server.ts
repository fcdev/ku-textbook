import { fail, json, readJson, withTeacher } from "@/server/http";
import { getCourse, latestPlan, saveEditedPlan } from "@/server/courses";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  return withTeacher(async (t) => {
    if (!(await getCourse(t.id, id))) return fail("课程不存在", 404);
    return json({ plan: await latestPlan(id) });
  });
}
export async function PUT(req: Request, { params }: Ctx) {
  const { id } = await params;
  const body = await readJson(req);
  return withTeacher(async (t) => {
    if (!(await getCourse(t.id, id))) return fail("课程不存在", 404);
    if (typeof body.contentMd !== "string") return fail("缺少 contentMd");
    const p = await saveEditedPlan(id, body.contentMd);
    return p ? json({ plan: p }) : fail("还没有教案，请先生成", 404);
  });
}
