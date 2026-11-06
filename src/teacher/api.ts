"use client";
/**
 * 教师端数据接口。两种实现：
 * - http：连本站服务端（PostgreSQL + 大模型），正式环境用。
 * - demo：数据存在浏览器 localStorage，教案用模板生成。静态站点（GitHub Pages）上的演示用。
 * 构建时 NEXT_PUBLIC_DEMO=1 选 demo。
 */
import type { Course, CoursePatch, Plan, PlanEvent, Teacher } from "@/lib/teacher-types";
import type { LessonKu } from "@/lib/lesson-plan";
import type { KuMeta } from "@/lib/content";

/** 教师端页面在构建期拿到的内容（演示模式在浏览器里生成教案要用）。 */
export interface TeacherContent {
  kus: KuMeta[];
  lessonKus: Record<string, LessonKu>;
  /** 投屏模式用的实验：KU 正文里第一个 <Experiment> 的 id 和 preset */
  present: Record<string, { experiment: string; preset: string }>;
}

export interface RegisterInput { inviteCode: string; name: string; school: string; account: string; password: string }

export interface TeacherApi {
  demo: boolean;
  me(): Promise<Teacher | null>;
  register(i: RegisterInput): Promise<Teacher>;
  login(account: string, password: string): Promise<Teacher>;
  logout(): Promise<void>;
  listCourses(): Promise<Course[]>;
  getCourse(id: string): Promise<Course | null>;
  createCourse(p?: CoursePatch): Promise<Course>;
  updateCourse(id: string, p: CoursePatch): Promise<Course>;
  deleteCourse(id: string): Promise<void>;
  getPlan(courseId: string): Promise<Plan | null>;
  savePlan(courseId: string, contentMd: string): Promise<Plan>;
  /** content 只在 demo 模式下用（服务端自己读内容）。 */
  generatePlan(courseId: string, onEvent: (e: PlanEvent) => void, content: TeacherContent, signal?: AbortSignal): Promise<Plan>;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) {
    super(message);
  }
}

export const isDemo = process.env.NEXT_PUBLIC_DEMO === "1";

let impl: Promise<TeacherApi> | null = null;
export function teacherApi(): Promise<TeacherApi> {
  impl ??= isDemo ? import("./api-demo").then((m) => m.demoApi) : import("./api-http").then((m) => m.httpApi);
  return impl;
}
