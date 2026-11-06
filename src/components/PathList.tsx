"use client";
import Link from "next/link";
import type { Graph } from "@/lib/graph";
import type { KuMeta } from "@/lib/content";
import type { Progress } from "@/lib/progress";
import { t } from "@/lib/strings";

/** 学习路径列表：已学的打勾划掉，其余按顺序编号。 */
export default function PathList({ path, kus, done, showFullLink }: { path: string[]; kus: Graph<KuMeta>; done: Progress; showFullLink?: boolean }) {
  const target = kus.byId.get(path[path.length - 1])!;
  const pending = path.filter((id) => !done[id]?.done);
  const stepNo = new Map(pending.map((id, i) => [id, i + 1]));
  const minutes = pending.reduce((s, id) => s + (kus.byId.get(id)!.estMinutes ?? 0), 0);
  const next = pending.find((id) => kus.byId.get(id)!.status !== "planned");
  return (
    <section className="rounded-[var(--radius-ku)] border border-line bg-surface p-4" aria-labelledby="path-h">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="path-h" className="text-lg font-bold">{t.pathTitle} · {target.title}</h2>
        <span className="text-xs text-muted">{t.pathTotal(pending.length, minutes)}</span>
      </div>
      <ol className="space-y-1.5">
        {path.map((id) => {
          const k = kus.byId.get(id)!;
          const isDone = !!done[id]?.done;
          const planned = k.status === "planned";
          return (
            <li key={id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-bg">
              <span className={`mono inline-grid size-6 shrink-0 place-items-center rounded-full text-xs ${isDone ? "bg-good-soft text-good" : "bg-accent-soft text-ink"}`}>
                {isDone ? "✓" : stepNo.get(id)}
              </span>
              <span className={`flex-1 ${isDone ? "text-muted line-through" : ""} ${planned ? "text-muted" : ""}`}>
                {planned ? k.title : <Link href={`/ku/${id}`} className="text-inherit no-underline hover:underline">{k.title}</Link>}
              </span>
              {planned ? (
                <span className="text-xs text-muted">{t.comingSoon}</span>
              ) : id === next ? (
                <Link href={`/ku/${id}`} className="rounded-full bg-primary px-3 py-1 text-xs text-on-primary no-underline">
                  {t.start}{k.estMinutes ? ` · ${k.estMinutes} 分钟` : ""}
                </Link>
              ) : (
                <span className="mono text-xs text-muted">{k.estMinutes ? `${k.estMinutes} 分钟` : ""}</span>
              )}
            </li>
          );
        })}
      </ol>
      {showFullLink && (
        <p className="mt-3 text-right text-sm"><Link href={`/path/${target.id}`}>{t.pathOpen} →</Link></p>
      )}
    </section>
  );
}
