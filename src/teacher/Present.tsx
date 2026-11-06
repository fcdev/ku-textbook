"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ExperimentEmbed from "@/components/ExperimentEmbed";
import { courseItems } from "@/lib/course";
import { buildGraph } from "@/lib/graph";
import { tt } from "@/lib/strings";
import type { Course } from "@/lib/teacher-types";
import type { TeacherContent } from "./api";
import { Spinner } from "./TeacherShell";
import { useTeacher } from "./useTeacher";

/** 投屏：一页一个 KU 的实验，大字号、高对比；← → 或底部按钮翻页。 */
export default function Present({ content }: { content: TeacherContent }) {
  const id = useSearchParams().get("course") ?? "";
  const { api, teacher, loading } = useTeacher();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [page, setPage] = useState(0);
  const graph = useMemo(() => buildGraph(content.kus), [content.kus]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (api && teacher) api.getCourse(id).then(setCourse); }, [api, teacher, id]);

  const slides = course ? courseItems(graph, course.kuIds, course.learnedKuIds).filter((i) => !i.learned && content.present[i.id]).map((i) => i.id) : [];
  const n = slides.length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setPage((p) => Math.min(n - 1, p + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n]);

  if (loading || !teacher || course === undefined) return <Spinner />;
  if (course === null) return <p>课程不存在。</p>;
  const kid = slides[page];
  const k = kid ? graph.byId.get(kid)! : null;

  return (
    <div ref={box} className="theme-projector -mx-4 min-h-[80vh] space-y-6 px-4 py-6 text-[20px] md:px-10">
      <div className="flex flex-wrap items-center gap-3 text-base">
        <Link href={`/teacher/plan?id=${course.id}`} className="text-ink">{tt.exitPresent}</Link>
        <span className="text-muted">{course.title}</span>
        <button type="button" className="ml-auto min-h-11 rounded-lg border-2 border-line px-4" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen())}>全屏</button>
      </div>
      {!k ? <p className="py-20 text-center">{tt.presentEmpty}</p> : (
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold md:text-5xl">{k.title}</h1>
            {k.summary && <p className="text-2xl text-ink-2">{k.summary}</p>}
          </div>
          <div className="[&_.plot_text]:!text-[16px] [&_.slider]:text-xl">
            <ExperimentEmbed key={kid} id={content.present[kid].experiment} preset={content.present[kid].preset} />
          </div>
        </div>
      )}
      {n > 0 && (
        <nav className="sticky bottom-0 flex items-center justify-between gap-3 border-t-2 border-line bg-bg py-3" aria-label="翻页">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="min-h-14 rounded-xl border-2 border-line px-6 text-xl disabled:opacity-30">← {tt.prev}</button>
          <span className="mono text-xl">{page + 1} / {n}</span>
          <button type="button" disabled={page >= n - 1} onClick={() => setPage(page + 1)} className="min-h-14 rounded-xl bg-primary px-6 text-xl font-bold text-on-primary disabled:opacity-30">{tt.next} →</button>
        </nav>
      )}
    </div>
  );
}
