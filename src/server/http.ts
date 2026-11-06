import "server-only";
import { NextResponse } from "next/server";
import { AuthError, currentTeacher } from "./auth";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400, code?: string) => NextResponse.json({ error: message, code }, { status });

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

/** 需要登录的接口：未登录返回 401。 */
export async function withTeacher<T>(fn: (t: NonNullable<Awaited<ReturnType<typeof currentTeacher>>>) => Promise<T>) {
  const t = await currentTeacher();
  if (!t) return fail("请先登录", 401, "auth");
  return fn(t);
}

export function authErrorResponse(e: unknown) {
  if (e instanceof AuthError) return fail(e.message, e.code === "credentials" ? 401 : 400, e.code);
  throw e;
}
