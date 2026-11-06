"use client";
import { buildGraph } from "@/lib/graph";
import { lessonInput } from "@/lib/course";
import { generatePlan } from "@/lib/plan-generator";
import type { Course, Plan, Teacher } from "@/lib/teacher-types";
import { ApiError, type TeacherApi } from "./api";

/** 演示模式：数据只在这台设备的浏览器里。邀请码固定为 DEMO_INVITE。 */
export { DEMO_INVITE } from "./demo-const";
import { DEMO_INVITE } from "./demo-const";
const K = { teacher: "ku-demo-teacher", session: "ku-demo-session", courses: "ku-demo-courses", plans: "ku-demo-plans" };

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 存不下就算了 */ }
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

type Stored = Teacher & { password: string };

function requireLogin(): Teacher {
  const t = load<Stored | null>(K.teacher, null);
  if (!t || !load<boolean>(K.session, false)) throw new ApiError("请先登录", 401, "auth");
  return t;
}

export const demoApi: TeacherApi = {
  demo: true,
  async me() {
    try { const t = requireLogin(); return { id: t.id, name: t.name, school: t.school, account: t.account }; } catch { return null; }
  },
  async register(i) {
    if (i.inviteCode.trim().toUpperCase() !== DEMO_INVITE) throw new ApiError("邀请码无效或已用完，请联系我们获取新的邀请码", 400, "invite");
    if (!i.name.trim()) throw new ApiError("请填写姓名", 400, "input");
    if (!/^1\d{10}$/.test(i.account.trim()) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.account.trim())) throw new ApiError("请填写 11 位手机号或邮箱", 400, "account");
    if (i.password.length < 8) throw new ApiError("密码至少 8 位", 400, "input");
    const t: Stored = { id: uid(), name: i.name.trim(), school: i.school.trim(), account: i.account.trim(), password: i.password };
    save(K.teacher, t); save(K.session, true);
    return { id: t.id, name: t.name, school: t.school, account: t.account };
  },
  async login(account, password) {
    const t = load<Stored | null>(K.teacher, null);
    if (!t || t.account !== account.trim() || t.password !== password) throw new ApiError("账号或密码不对", 401, "credentials");
    save(K.session, true);
    return { id: t.id, name: t.name, school: t.school, account: t.account };
  },
  async logout() { save(K.session, false); },
  async listCourses() {
    requireLogin();
    return load<Course[]>(K.courses, []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getCourse(id) { requireLogin(); return load<Course[]>(K.courses, []).find((c) => c.id === id) ?? null; },
  async createCourse(p = {}) {
    requireLogin();
    const c: Course = { id: uid(), title: "新课程", kuIds: [], learnedKuIds: [], stage: "高中", periods: 1, subject: "数学", ...p, updatedAt: new Date().toISOString() };
    save(K.courses, [...load<Course[]>(K.courses, []), c]);
    return c;
  },
  async updateCourse(id, p) {
    requireLogin();
    const all = load<Course[]>(K.courses, []);
    const i = all.findIndex((c) => c.id === id);
    if (i < 0) throw new ApiError("课程不存在", 404);
    all[i] = { ...all[i], ...p, updatedAt: new Date().toISOString() };
    save(K.courses, all);
    return all[i];
  },
  async deleteCourse(id) {
    requireLogin();
    save(K.courses, load<Course[]>(K.courses, []).filter((c) => c.id !== id));
    const plans = load<Record<string, Plan>>(K.plans, {});
    delete plans[id];
    save(K.plans, plans);
  },
  async getPlan(courseId) { requireLogin(); return load<Record<string, Plan>>(K.plans, {})[courseId] ?? null; },
  async savePlan(courseId, contentMd) {
    requireLogin();
    const plans = load<Record<string, Plan>>(K.plans, {});
    if (!plans[courseId]) throw new ApiError("还没有教案，请先生成", 404);
    plans[courseId] = { ...plans[courseId], contentMd, editedAt: new Date().toISOString() };
    save(K.plans, plans);
    return plans[courseId];
  },
  async generatePlan(courseId, onEvent, content, signal) {
    const course = await this.getCourse(courseId);
    if (!course) throw new ApiError("课程不存在", 404);
    const input = lessonInput(buildGraph(content.kus), course, content.lessonKus);
    const r = await generatePlan(input, { system: "", user: "" }, null, onEvent, { chunkDelayMs: 12, signal });
    const plan: Plan = { id: uid(), courseId, contentMd: r.content, model: "template", promptVersion: "template", createdAt: new Date().toISOString(), editedAt: null };
    const plans = load<Record<string, Plan>>(K.plans, {});
    plans[courseId] = plan;
    save(K.plans, plans);
    onEvent({ t: "done", plan, source: "template" });
    return plan;
  },
};
