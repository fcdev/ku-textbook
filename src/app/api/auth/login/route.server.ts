import { authErrorResponse, json, readJson } from "@/server/http";
import { login, publicTeacher, setSessionCookie } from "@/server/auth";

export async function POST(req: Request) {
  const b = await readJson(req);
  try {
    const t = await login(String(b.account ?? ""), String(b.password ?? ""));
    await setSessionCookie(t.id);
    return json({ teacher: publicTeacher(t) });
  } catch (e) {
    return authErrorResponse(e);
  }
}
