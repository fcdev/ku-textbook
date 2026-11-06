import { json } from "@/server/http";
import { clearSessionCookie } from "@/server/auth";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
