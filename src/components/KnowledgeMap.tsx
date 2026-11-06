"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buildGraph, closure, layers, topoSort, type Graph } from "@/lib/graph";
import type { KuMeta } from "@/lib/content";
import { t } from "@/lib/strings";
import { useProgress } from "./useProgress";

const NW = 132, NH = 44, CX = 160, RY = 60, PX = 16, PY = 16;

export default function KnowledgeMap({ kus, searchText }: { kus: KuMeta[]; searchText: Record<string, string> }) {
  const graph = useMemo(() => buildGraph(kus), [kus]);
  const cols = useMemo(() => layers(graph), [graph]);
  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    cols.forEach((col, ci) => col.forEach((id, ri) => m.set(id, { x: PX + ci * CX, y: PY + ri * RY })));
    return m;
  }, [cols]);
  const W = PX * 2 + (cols.length - 1) * CX + NW;
  const H = PY * 2 + (Math.max(...cols.map((c) => c.length)) - 1) * RY + NH;

  const progress = useProgress();
  const [target, setTarget] = useState<string>("overfit");
  const [query, setQuery] = useState("");

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return null;
    const ch = q.match(/^第?(\d+)章?$/);
    return new Set(
      kus.filter((k) => (ch ? k.chapter === Number(ch[1]) : searchText[k.id].replace(/\s+/g, "").includes(q))).map((k) => k.id),
    );
  }, [query, kus, searchText]);

  const path = useMemo(() => topoSort(graph, closure(graph, [target])), [graph, target]);
  const onPath = new Set(path);
  const pending = path.filter((id) => !progress[id]?.done);
  const stepNo = new Map(pending.map((id, i) => [id, i + 1]));
  const minutes = path.reduce((s, id) => s + (progress[id]?.done ? 0 : graph.byId.get(id)!.estMinutes ?? 0), 0);

  const nodeState = (id: string) => {
    const k = graph.byId.get(id)!;
    return {
      k,
      done: !!progress[id]?.done,
      planned: k.status === "planned",
      isTarget: id === target,
      inPath: onPath.has(id),
      dim: hits ? !hits.has(id) : false,
    };
  };

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.searchPlaceholder}
        aria-label={t.searchPlaceholder}
        className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-accent"
      />
      {hits && hits.size === 0 && <p className="text-sm text-muted">{t.searchEmpty}</p>}

      <MapLegend />

      {/* 桌面：前置关系图 */}
      <div className="hidden overflow-x-auto rounded-[var(--radius-ku)] border border-line bg-surface p-3 md:block">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 900 }} className="block h-auto" role="img" aria-label={`${kus.length} 个知识点的前置关系图`}>
          {graph.nodes.flatMap((k) =>
            k.prerequisites.map((p) => {
              const a = pos.get(p)!, b = pos.get(k.id)!;
              const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = b.x, y2 = b.y + NH / 2, mx = (x1 + x2) / 2;
              const hot = onPath.has(p) && onPath.has(k.id);
              const dim = hits && !(hits.has(p) && hits.has(k.id));
              return (
                <path key={`${p}-${k.id}`} d={`M${x1} ${y1}C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}`} fill="none"
                  stroke={hot ? "var(--color-accent)" : "var(--color-line)"} strokeWidth={hot ? 2.2 : 1.4} opacity={dim ? 0.25 : 1} />
              );
            }),
          )}
          {graph.nodes.map((k) => {
            const s = nodeState(k.id);
            const p = pos.get(k.id)!;
            const n = stepNo.get(k.id);
            const fill = s.isTarget ? "var(--color-accent)" : s.inPath ? "var(--color-accent-soft)" : "var(--color-surface)";
            const stroke = s.isTarget || s.inPath ? "var(--color-accent)" : "var(--color-line)";
            const ink = s.isTarget ? "var(--color-surface)" : s.planned ? "var(--color-muted)" : "var(--color-ink)";
            return (
              <g key={k.id} transform={`translate(${p.x},${p.y})`} opacity={s.dim ? 0.25 : 1} className="cursor-pointer"
                role="button" tabIndex={0} aria-pressed={s.isTarget} aria-label={`${k.title}${s.planned ? `，${t.comingSoon}` : ""}${s.done ? `，${t.legendDone}` : ""}`}
                onClick={() => setTarget(k.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setTarget(k.id))}>
                <rect width={NW} height={NH} rx={8} fill={fill} stroke={stroke} strokeWidth={s.isTarget || s.inPath ? 2 : 1.2} strokeDasharray={s.planned && !s.inPath ? "4 3" : undefined} />
                <text x={NW / 2} y={NH / 2 + (s.planned ? -1 : 5)} textAnchor="middle" fontSize={14} fill={ink} fontWeight={s.isTarget ? 700 : 500}>{k.title}</text>
                {s.planned && <text x={NW / 2} y={NH / 2 + 14} textAnchor="middle" fontSize={10} fill={s.isTarget ? "var(--color-surface)" : "var(--color-muted)"}>{t.comingSoon}</text>}
                {s.done && <text x={NW - 8} y={14} textAnchor="end" fontSize={12} fill="var(--color-good)">✓</text>}
                {n !== undefined && (
                  <g transform="translate(-6,-6)">
                    <circle r={10} cx={0} cy={0} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />
                    <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-surface)" className="mono">{n}</text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 手机：按层的竖向列表 */}
      <ol className="space-y-4 md:hidden" aria-label={t.navMap}>
        {cols.map((col, ci) => (
          <li key={ci}>
            <div className="mb-1.5 text-xs text-muted">第 {ci + 1} 层</div>
            <div className="flex flex-wrap gap-2">
              {col.map((id) => {
                const s = nodeState(id);
                const n = stepNo.get(id);
                return (
                  <button key={id} type="button" onClick={() => setTarget(id)} aria-pressed={s.isTarget}
                    className={[
                      "relative min-h-11 rounded-lg border px-3 text-left text-sm",
                      s.isTarget ? "border-accent bg-accent font-bold text-surface" : s.inPath ? "border-accent bg-accent-soft" : "border-line bg-surface",
                      s.planned && !s.isTarget ? "border-dashed text-muted" : "",
                      s.dim ? "opacity-30" : "",
                    ].join(" ")}>
                    {n !== undefined && <span className="mono mr-1.5 inline-grid size-5 place-items-center rounded-full bg-accent text-[11px] text-surface">{n}</span>}
                    {s.k.title}
                    {s.done && <span className="ml-1 text-good">✓</span>}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <PathPanel path={path} graph={graph} done={progress} stepNo={stepNo} minutes={minutes} />
    </div>
  );
}

function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded border border-line bg-surface" />{t.legendReady}</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded border border-dashed border-muted" />{t.legendPlanned}</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded border-2 border-accent bg-accent-soft" />{t.legendPath}</span>
      <span className="inline-flex items-center gap-1.5"><span className="text-good">✓</span>{t.legendDone}</span>
    </div>
  );
}

function PathPanel({ path, graph, done, stepNo, minutes }: {
  path: string[];
  graph: Graph<KuMeta>;
  done: Record<string, { done: boolean }>;
  stepNo: Map<string, number>;
  minutes: number;
}) {
  const target = graph.byId.get(path[path.length - 1])!;
  return (
    <section className="rounded-[var(--radius-ku)] border border-line bg-surface p-4" aria-labelledby="path-h">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="path-h" className="text-lg font-bold">{t.pathTitle} · {target.title}</h2>
        <span className="text-xs text-muted">{t.pathTotal(path.length, minutes)}</span>
      </div>
      <ol className="space-y-1.5">
        {path.map((id) => {
          const k = graph.byId.get(id)!;
          const isDone = !!done[id]?.done;
          const planned = k.status === "planned";
          return (
            <li key={id} className="flex min-h-11 items-center gap-3 rounded-lg px-2 hover:bg-bg">
              <span className={`mono inline-grid size-6 shrink-0 place-items-center rounded-full text-xs ${isDone ? "bg-good-soft text-good" : "bg-accent-soft text-accent"}`}>
                {isDone ? "✓" : stepNo.get(id)}
              </span>
              <span className={`flex-1 ${isDone ? "text-muted line-through" : ""} ${planned ? "text-muted" : ""}`}>{k.title}</span>
              {planned ? (
                <span className="text-xs text-muted">{t.comingSoon}</span>
              ) : (
                <Link href={`/ku/${id}`} className="rounded-full bg-accent px-3 py-1 text-xs text-surface no-underline">
                  {t.start}{k.estMinutes ? ` · ${k.estMinutes} 分钟` : ""}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
