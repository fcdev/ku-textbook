import { json } from "@/server/http";
import { currentTeacher, publicTeacher } from "@/server/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  const t = await currentTeacher();
  return json({ teacher: t ? publicTeacher(t) : null });
}
