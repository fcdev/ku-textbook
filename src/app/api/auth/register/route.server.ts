import { authErrorResponse, json, readJson } from "@/server/http";
import { publicTeacher, register, setSessionCookie } from "@/server/auth";

export async function POST(req: Request) {
  const b = await readJson(req);
  try {
    const t = await register({
      inviteCode: String(b.inviteCode ?? ""), name: String(b.name ?? ""), school: String(b.school ?? ""),
      account: String(b.account ?? ""), password: String(b.password ?? ""),
    });
    await setSessionCookie(t.id);
    return json({ teacher: publicTeacher(t) });
  } catch (e) {
    return authErrorResponse(e);
  }
}
