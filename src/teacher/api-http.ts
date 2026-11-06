"use client";
import type { Course, Plan, PlanEvent, Teacher } from "@/lib/teacher-types";
import { ApiError, type TeacherApi } from "./api";

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `请求失败（${res.status}）`, res.status, data.code);
  return data as T;
}

export const httpApi: TeacherApi = {
  demo: false,
  me: async () => (await call<{ teacher: Teacher | null }>("GET", "/api/auth/me")).teacher,
  register: async (i) => (await call<{ teacher: Teacher }>("POST", "/api/auth/register", i)).teacher,
  login: async (account, password) => (await call<{ teacher: Teacher }>("POST", "/api/auth/login", { account, password })).teacher,
  logout: async () => { await call("POST", "/api/auth/logout"); },
  listCourses: async () => (await call<{ courses: Course[] }>("GET", "/api/courses")).courses,
  getCourse: async (id) => {
    try { return (await call<{ course: Course }>("GET", `/api/courses/${encodeURIComponent(id)}`)).course; }
    catch (e) { if (e instanceof ApiError && e.status === 404) return null; throw e; }
  },
  createCourse: async (p = {}) => (await call<{ course: Course }>("POST", "/api/courses", p)).course,
  updateCourse: async (id, p) => (await call<{ course: Course }>("PATCH", `/api/courses/${encodeURIComponent(id)}`, p)).course,
  deleteCourse: async (id) => { await call("DELETE", `/api/courses/${encodeURIComponent(id)}`); },
  getPlan: async (id) => (await call<{ plan: Plan | null }>("GET", `/api/courses/${encodeURIComponent(id)}/plan`)).plan,
  savePlan: async (id, contentMd) => (await call<{ plan: Plan }>("PUT", `/api/courses/${encodeURIComponent(id)}/plan`, { contentMd })).plan,
  async generatePlan(courseId, onEvent, _content, signal) {
    const res = await fetch("/api/lesson-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId }), signal });
    if (!res.ok || !res.body) {
      const d = await res.json().catch(() => ({}));
      throw new ApiError(d.error ?? `生成失败（${res.status}）`, res.status, d.code);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", plan: Plan | null = null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        const e = JSON.parse(line) as PlanEvent;
        onEvent(e);
        if (e.t === "done") plan = e.plan;
        if (e.t === "error") throw new ApiError(e.message, 500);
      }
    }
    if (!plan) throw new ApiError("生成中断了，请重试", 500);
    return plan;
  },
};
