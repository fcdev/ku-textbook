"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { renderMarkdown } from "@/lib/md";
import { flowMinutes } from "@/lib/lesson-plan";
import { tt } from "@/lib/strings";
import type { Course, Plan } from "@/lib/teacher-types";
import type { TeacherContent } from "./api";
import TeacherShell, { Spinner } from "./TeacherShell";
import { useTeacher } from "./useTeacher";

export default function PlanEditor({ content }: { content: TeacherContent }) {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("id") ?? "";
  const autoGen = sp.get("generate") === "1";
  const { api, teacher, loading } = useTeacher();
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [note, setNote] = useState("");
  const [source, setSource] = useState<"llm" | "template" | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  const started = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    if (!api) return;
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setStreaming(true); setText(""); setNote(""); setMode("preview"); setDirty(false);
    try {
      const p = await api.generatePlan(id, (e) => {
        if (e.t === "delta") setText((t) => t + e.text);
        if (e.t === "reset") { setText(""); setNote(e.reason); }
        if (e.t === "done") setSource(e.source);
      }, content, ac.signal);
      setPlan(p); setText(p.contentMd);
    } catch (e) {
      if (!ac.signal.aborted) setNote(`生成失败：${(e as Error).message}`);
    } finally {
      setStreaming(false);
    }
  }, [api, id, content]);

  useEffect(() => {
    if (!api || !teacher) return;
    (async () => {
      const c = await api.getCourse(id);
      setCourse(c);
      if (!c) return;
      const p = await api.getPlan(id);
      setPlan(p);
      if (p) { setText(p.contentMd); setSource(p.model === "template" ? "template" : "llm"); }
      if (autoGen && !started.current) {
        started.current = true;
        router.replace(`/teacher/plan?id=${id}`);
        void generate();
      }
    })();
  }, [api, teacher, id, autoGen, generate, router]);
  useEffect(() => () => abort.current?.abort(), []);

  if (loading || !api || !teacher || course === undefined) return <Spinner />;
  if (course === null) return <TeacherShell api={api} teacher={teacher} back={{ href: "/teacher", label: tt.backToCourses }}><p>课程不存在。</p></TeacherShell>;

  const save = async () => {
    setSaveState("saving");
    const p = await api.savePlan(id, text);
    setPlan(p); setDirty(false); setSaveState("saved");
  };
  const exportMd = () => {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${course.title || "教案"}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const total = flowMinutes(text).reduce((a, b) => a + b, 0);

  return (
    <TeacherShell api={api} teacher={teacher} back={{ href: `/teacher/course?id=${id}`, label: tt.backToCourse }}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-3xl font-bold">{course.title} · {tt.plan}</h1>
        <button type="button" onClick={generate} disabled={streaming} className="min-h-11 rounded-xl border border-line px-4 hover:border-primary disabled:opacity-40">
          {plan ? tt.regenerate : tt.generate}
        </button>
        <button type="button" onClick={exportMd} disabled={!text || streaming} className="min-h-11 rounded-xl border border-line px-4 hover:border-primary disabled:opacity-40">{tt.exportMd}</button>
        <Link href={`/present?course=${id}`} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-bold text-on-primary no-underline">{tt.present}</Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted" aria-live="polite">
        {streaming && <span className="inline-flex items-center gap-2"><i className="inline-block size-2 animate-pulse rounded-full bg-accent" />{tt.generating}</span>}
        {!streaming && source && <span>{source === "llm" ? tt.sourceLlm(plan?.model ?? "") : tt.sourceTemplate}{plan?.editedAt ? ` · ${tt.edited}` : ""}</span>}
        {total > 0 && <span className="mono">课堂流程合计 {total} 分钟</span>}
        {note && <span className="text-bad">{note}</span>}
      </div>

      {!text && !streaming ? (
        <div className="space-y-3 rounded-[var(--radius-ku)] border border-dashed border-line bg-surface p-8 text-center">
          <p className="text-muted">{tt.noPlan}</p>
          <button type="button" onClick={generate} className="min-h-12 rounded-xl bg-primary px-6 font-bold text-on-primary">{tt.generate}</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="显示方式">
              {(["preview", "edit"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} disabled={streaming} onClick={() => setMode(m)}
                  className={`min-h-9 rounded-full px-4 text-sm ${mode === m ? "bg-primary font-bold text-on-primary" : "text-muted"}`}>{m === "preview" ? tt.previewMode : tt.editMode}</button>
              ))}
            </div>
            {dirty && <button type="button" onClick={save} className="ml-auto min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary">{tt.save}</button>}
            {!dirty && saveState === "saved" && <span className="ml-auto text-sm text-good">✓ {tt.saved}</span>}
          </div>
          {mode === "edit" ? (
            <textarea value={text} onChange={(e) => { setText(e.target.value); setDirty(true); setSaveState(""); }} aria-label="教案 Markdown"
              className="mono min-h-[70vh] w-full rounded-[var(--radius-ku)] border border-line bg-surface p-4 text-sm leading-relaxed outline-none focus:border-focus" />
          ) : (
            <article className="plan-md rounded-[var(--radius-ku)] border border-line bg-surface p-5 md:p-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(text) + (streaming ? '<span class="caret">▍</span>' : "") }} />
          )}
        </div>
      )}
    </TeacherShell>
  );
}
