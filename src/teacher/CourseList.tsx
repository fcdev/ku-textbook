"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { tt } from "@/lib/strings";
import type { Course } from "@/lib/teacher-types";
import TeacherShell, { Spinner } from "./TeacherShell";
import { useTeacher } from "./useTeacher";

export default function CourseList() {
  const { api, teacher, loading } = useTeacher();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => { if (api && teacher) api.listCourses().then(setCourses); }, [api, teacher]);
  if (loading || !teacher || !api) return <Spinner />;

  const create = async () => {
    const c = await api.createCourse({ title: "新课程" });
    router.push(`/teacher/course?id=${c.id}`);
  };
  return (
    <TeacherShell api={api} teacher={teacher}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{tt.myCourses}</h1>
        <button type="button" onClick={create} className="min-h-11 rounded-xl bg-primary px-5 font-bold text-on-primary">+ {tt.newCourse}</button>
      </div>
      {courses === null ? <Spinner /> : courses.length === 0 ? (
        <p className="rounded-[var(--radius-ku)] border border-dashed border-line bg-surface p-8 text-center text-muted">{tt.noCourses}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id} className="space-y-2 rounded-[var(--radius-ku)] border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-sans text-lg font-bold">{c.title}</h2>
                <span className="mono shrink-0 text-xs text-muted">{new Date(c.updatedAt).toLocaleDateString("zh-CN")}</span>
              </div>
              <p className="text-sm text-muted">{tt.stageLabel[c.stage]} · {tt.periodsLabel(c.periods)} · {tt.subjectLabel[c.subject]} · {c.kuIds.length} 个知识点</p>
              <div className="flex flex-wrap gap-2 pt-1 text-sm">
                <Link href={`/teacher/course?id=${c.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-ink no-underline hover:border-primary">{tt.edit}</Link>
                <Link href={`/teacher/plan?id=${c.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-ink no-underline hover:border-primary">{tt.plan}</Link>
                <Link href={`/present?course=${c.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-line px-3 text-ink no-underline hover:border-primary">{tt.present}</Link>
                <button type="button" className="ml-auto min-h-10 rounded-lg px-3 text-bad hover:bg-bad-soft"
                  onClick={async () => { if (confirm(tt.confirmDelete(c.title))) { await api.deleteCourse(c.id); setCourses(courses.filter((x) => x.id !== c.id)); } }}>
                  {tt.deleteCourse}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </TeacherShell>
  );
}
