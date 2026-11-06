"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { courseItems } from "@/lib/course";
import { buildGraph } from "@/lib/graph";
import { tt } from "@/lib/strings";
import { STAGES, SUBJECTS, type Course, type CoursePatch } from "@/lib/teacher-types";
import type { TeacherContent } from "./api";
import TeacherShell, { Spinner } from "./TeacherShell";
import { useTeacher } from "./useTeacher";

export default function CourseEditor({ content }: { content: TeacherContent }) {
  const id = useSearchParams().get("id") ?? "";
  const { api, teacher, loading } = useTeacher();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const graph = useMemo(() => buildGraph(content.kus), [content.kus]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<CoursePatch>({});
  const router = useRouter();

  useEffect(() => { if (api && teacher) api.getCourse(id).then(setCourse); }, [api, teacher, id]);
  if (loading || !api || !teacher || course === undefined) return <Spinner />;
  if (course === null) return <TeacherShell api={api} teacher={teacher} back={{ href: "/teacher", label: tt.backToCourses }}><p>课程不存在。</p></TeacherShell>;

  /** 本地立即更新，500 ms 后合并保存 */
  const patch = (p: CoursePatch) => {
    setCourse({ ...course, ...p });
    pending.current = { ...pending.current, ...p };
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const body = pending.current;
      pending.current = {};
      await api.updateCourse(course.id, body);
      setStatus("saved");
    }, 500);
  };

  /** 离开页面前把没保存的改动存掉 */
  const go = async (href: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (Object.keys(pending.current).length) { await api.updateCourse(course.id, pending.current); pending.current = {}; }
    router.push(href);
  };

  const items = courseItems(graph, course.kuIds, course.learnedKuIds);
  const selected = new Set(course.kuIds);
  const toggle = (kid: string) => patch({ kuIds: selected.has(kid) ? course.kuIds.filter((x) => x !== kid) : [...course.kuIds, kid] });
  const toggleLearned = (kid: string) => patch({ learnedKuIds: course.learnedKuIds.includes(kid) ? course.learnedKuIds.filter((x) => x !== kid) : [...course.learnedKuIds, kid] });

  // 左侧：按章节分组
  const byChapter = new Map<number, typeof content.kus>();
  for (const k of content.kus) byChapter.set(k.chapter ?? 0, [...(byChapter.get(k.chapter ?? 0) ?? []), k]);
  const chapters = [...byChapter.keys()].sort((a, b) => a - b);
  const seg = <T extends string | number>(label: string, values: readonly T[], cur: T, show: (v: T) => string, set: (v: T) => void) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-sm text-muted">{label}</span>
      <div className="inline-flex flex-wrap rounded-full border border-line bg-surface p-1" role="group" aria-label={label}>
        {values.map((v) => (
          <button key={String(v)} type="button" aria-pressed={cur === v} onClick={() => set(v)}
            className={`min-h-9 rounded-full px-4 text-sm ${cur === v ? "bg-primary font-bold text-on-primary" : "text-muted hover:text-ink"}`}>{show(v)}</button>
        ))}
      </div>
    </div>
  );

  return (
    <TeacherShell api={api} teacher={teacher} back={{ href: "/teacher", label: tt.backToCourses }}>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex-1 space-y-1">
          <span className="text-sm text-muted">{tt.courseTitle}</span>
          <input value={course.title} onChange={(e) => patch({ title: e.target.value })}
            className="h-12 w-full rounded-xl border border-line bg-surface px-4 font-display text-xl font-bold outline-none focus:border-focus" />
        </label>
        <span className="pb-3 text-xs text-muted" aria-live="polite">{status === "saving" ? tt.saving : status === "saved" ? tt.saved : ""}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="space-y-3 rounded-[var(--radius-ku)] border border-line bg-surface p-4" aria-labelledby="pick-h">
          <h2 id="pick-h" className="font-sans text-lg font-bold">{tt.pickKus}</h2>
          <p className="text-sm text-muted">{tt.pickHint}</p>
          {chapters.map((ch) => (
            <div key={ch}>
              <div className="mb-1 text-xs text-muted">{ch ? tt.chapter(ch) : "其他"}</div>
              <ul>
                {byChapter.get(ch)!.map((k) => {
                  const planned = k.status === "planned";
                  return (
                    <li key={k.id}>
                      <label className={`flex min-h-11 items-center gap-3 rounded-lg px-2 ${planned ? "text-muted" : "cursor-pointer hover:bg-bg"}`}>
                        <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={selected.has(k.id)} disabled={planned} onChange={() => toggle(k.id)} />
                        <span className="flex-1">{k.title}</span>
                        {planned && <span className="text-xs">{tt.comingSoonShort}</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <div className="space-y-5">
          <section className="space-y-3 rounded-[var(--radius-ku)] border border-line bg-surface p-4" aria-labelledby="order-h">
            <h2 id="order-h" className="font-sans text-lg font-bold">{tt.courseOrder}</h2>
            {items.length === 0 ? <p className="py-6 text-center text-muted">{tt.emptyCourse}</p> : (
              <ol className="space-y-1.5">
                {items.map((it, i) => {
                  const k = graph.byId.get(it.id)!;
                  return (
                    <li key={it.id} className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-1.5">
                      <span className="mono w-5 text-xs text-muted">{i + 1}</span>
                      <span className={`flex-1 ${it.learned ? "text-muted line-through" : ""}`}>{k.title}</span>
                      {it.auto && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs">{tt.autoPrereq}</span>}
                      {k.status === "planned" && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{tt.comingSoonShort}</span>}
                      <label className="flex min-h-9 cursor-pointer items-center gap-1.5 text-sm text-muted">
                        <input type="checkbox" className="size-4" checked={it.learned} onChange={() => toggleLearned(it.id)} />{tt.learned}
                      </label>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
          <section className="space-y-3 rounded-[var(--radius-ku)] border border-line bg-surface p-4">
            {seg(tt.stage, STAGES, course.stage, (v) => tt.stageLabel[v], (v) => patch({ stage: v }))}
            {seg(tt.periods, [1, 2] as const, course.periods as 1 | 2, (v) => tt.periodsLabel(v), (v) => patch({ periods: v }))}
            {seg(tt.subject, SUBJECTS, course.subject, (v) => tt.subjectLabel[v], (v) => patch({ subject: v }))}
          </section>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={items.length === 0} onClick={() => go(`/teacher/plan?id=${course.id}&generate=1`)}
              className="min-h-12 rounded-xl bg-primary px-6 font-bold text-on-primary disabled:opacity-40">
              {tt.generate} →
            </button>
            <button type="button" onClick={() => go(`/present?course=${course.id}`)} className="min-h-12 rounded-xl border border-line px-5 hover:border-primary">{tt.present}</button>
          </div>
        </div>
      </div>
    </TeacherShell>
  );
}
