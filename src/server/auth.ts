import "server-only";
import crypto from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { and, eq, or, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb, schema } from "@/db";

export const SESSION_COOKIE = "ku_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 天

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("生产环境必须设置 SESSION_SECRET（至少 32 个字符）");
  return "dev-only-session-secret-do-not-use-in-prod";
}

/** 会话 = 签名过的 “teacherId.过期时间”，放在 httpOnly cookie 里（见 docs/DECISIONS.md）。 */
export function signSession(teacherId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + MAX_AGE;
  const body = `${teacherId}.${exp}`;
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifySession(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, exp, mac] = parts;
  const expect = crypto.createHmac("sha256", secret()).update(`${id}.${exp}`).digest("base64url");
  const a = Buffer.from(mac), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Number(exp) * 1000 < now) return null;
  return id;
}

export async function setSessionCookie(teacherId: string) {
  (await cookies()).set(SESSION_COOKIE, signSession(teacherId), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentTeacher() {
  const id = verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const db = await getDb();
  const [t] = await db.select().from(schema.teachers).where(eq(schema.teachers.id, id)).limit(1);
  return t ?? null;
}

export class AuthError extends Error {
  constructor(public readonly code: "invite" | "account" | "exists" | "credentials" | "input", message: string) {
    super(message);
  }
}

const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const isPhone = (s: string) => /^1\d{10}$/.test(s);

export async function register(input: { inviteCode: string; name: string; school: string; account: string; password: string }) {
  secret(); // 配置不对时尽早失败，免得建了账号却发不出会话
  const account = input.account.trim();
  if (!input.name.trim()) throw new AuthError("input", "请填写姓名");
  if (!isEmail(account) && !isPhone(account)) throw new AuthError("account", "请填写 11 位手机号或邮箱");
  if (input.password.length < 8) throw new AuthError("input", "密码至少 8 位");
  const db = await getDb();
  const [code] = await db.select().from(schema.inviteCodes).where(eq(schema.inviteCodes.code, input.inviteCode.trim())).limit(1);
  if (!code || code.used >= code.maxUses || (code.expiresAt && code.expiresAt.getTime() < Date.now())) {
    throw new AuthError("invite", "邀请码无效或已用完，请联系我们获取新的邀请码");
  }
  const field = isEmail(account) ? schema.teachers.email : schema.teachers.phone;
  const [dup] = await db.select({ id: schema.teachers.id }).from(schema.teachers).where(eq(field, account)).limit(1);
  if (dup) throw new AuthError("exists", "这个手机号或邮箱已经注册过了，请直接登录");
  const passwordHash = await hash(input.password);
  const [t] = await db.insert(schema.teachers).values({
    name: input.name.trim(), school: input.school.trim(), passwordHash, inviteCodeId: code.id,
    ...(isEmail(account) ? { email: account } : { phone: account }),
  }).returning();
  // 原子地占用一次邀请码；并发超用时回滚
  const updated = await db.update(schema.inviteCodes).set({ used: sql`${schema.inviteCodes.used} + 1` })
    .where(and(eq(schema.inviteCodes.id, code.id), sql`${schema.inviteCodes.used} < ${schema.inviteCodes.maxUses}`)).returning();
  if (updated.length === 0) {
    await db.delete(schema.teachers).where(eq(schema.teachers.id, t.id));
    throw new AuthError("invite", "邀请码无效或已用完，请联系我们获取新的邀请码");
  }
  return t;
}

export async function login(account: string, password: string) {
  const db = await getDb();
  const a = account.trim();
  const [t] = await db.select().from(schema.teachers).where(or(eq(schema.teachers.email, a), eq(schema.teachers.phone, a))).limit(1);
  if (!t || !(await verify(t.passwordHash, password))) throw new AuthError("credentials", "账号或密码不对");
  return t;
}

export function publicTeacher(t: typeof schema.teachers.$inferSelect) {
  return { id: t.id, name: t.name, school: t.school, account: t.email ?? t.phone ?? "" };
}
