"use client";
import { useMemo, useState } from "react";
import { buildGraph, closure, layers, topoSort } from "@/lib/graph";
import type { KuMeta } from "@/lib/content";
import { t } from "@/lib/strings";
import { search, type SearchDoc } from "@/lib/search";
import PathList from "./PathList";
import { useProgress } from "./useProgress";

const NW = 132, NH = 44, CX = 160, RY = 60, PX = 16, PY = 16;

export default function KnowledgeMap({ kus, index }: { kus: KuMeta[]; index: SearchDoc[] }) {
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
    const r = search(index, query);
    return r ? new Set(r) : null;
  }, [query, index]);

  const path = useMemo(() => topoSort(graph, closure(graph, [target])), [graph, target]);
  const onPath = new Set(path);
  const pending = path.filter((id) => !progress[id]?.done);
  const stepNo = new Map(pending.map((id, i) => [id, i + 1]));

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
        className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none focus:border-focus"
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
                  stroke={hot ? "var(--color-ink)" : "var(--color-line)"} strokeWidth={hot ? 2.2 : 1.4} opacity={dim ? 0.25 : 1} />
              );
            }),
          )}
          {graph.nodes.map((k) => {
            const s = nodeState(k.id);
            const p = pos.get(k.id)!;
            const n = stepNo.get(k.id);
            const fill = s.isTarget ? "var(--color-primary)" : s.inPath ? "var(--color-accent-soft)" : "var(--color-surface)";
            const stroke = s.isTarget ? "var(--color-primary)" : s.inPath ? "var(--color-line-strong)" : "var(--color-line)";
            const ink = s.isTarget ? "var(--color-on-primary)" : s.planned ? "var(--color-muted)" : "var(--color-ink)";
            return (
              <g key={k.id} transform={`translate(${p.x},${p.y})`} opacity={s.dim ? 0.25 : 1} className="cursor-pointer"
                role="button" tabIndex={0} aria-pressed={s.isTarget} aria-label={`${k.title}${s.planned ? `，${t.comingSoon}` : ""}${s.done ? `，${t.legendDone}` : ""}`}
                onClick={() => setTarget(k.id)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setTarget(k.id))}>
                <rect width={NW} height={NH} rx={8} fill={fill} stroke={stroke} strokeWidth={s.isTarget || s.inPath ? 2 : 1.2} strokeDasharray={s.planned && !s.inPath ? "4 3" : undefined} />
                <text x={NW / 2} y={NH / 2 + (s.planned ? -1 : 5)} textAnchor="middle" fontSize={14} fill={ink} fontWeight={s.isTarget ? 700 : 500}>{k.title}</text>
                {s.planned && <text x={NW / 2} y={NH / 2 + 14} textAnchor="middle" fontSize={10} fill={s.isTarget ? "var(--color-on-primary)" : "var(--color-muted)"}>{t.comingSoon}</text>}
                {s.done && <text x={NW - 8} y={14} textAnchor="end" fontSize={12} fill="var(--color-good)">✓</text>}
                {n !== undefined && (
                  <g transform="translate(-6,-6)">
                    <circle r={10} cx={0} cy={0} fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth={1.2} />
                    <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--color-on-accent)" className="mono">{n}</text>
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
                      s.isTarget ? "border-accent bg-primary font-bold text-on-primary" : s.inPath ? "border-line-strong bg-accent-soft" : "border-line bg-surface",
                      s.planned && !s.isTarget ? "border-dashed text-muted" : "",
                      s.dim ? "opacity-30" : "",
                    ].join(" ")}>
                    {n !== undefined && <span className="mono mr-1.5 inline-grid size-5 place-items-center rounded-full bg-accent text-[11px] text-on-accent">{n}</span>}
                    {s.k.title}
                    {s.done && <span className="ml-1 text-good">✓</span>}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <PathList path={path} kus={graph} done={progress} showFullLink />
    </div>
  );
}

function MapLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded border border-line bg-surface" />{t.legendReady}</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded border border-dashed border-muted" />{t.legendPlanned}</span>
      <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3 w-5 rounded border-2 border-line-strong bg-accent-soft" />{t.legendPath}</span>
      <span className="inline-flex items-center gap-1.5"><span className="text-good">✓</span>{t.legendDone}</span>
    </div>
  );
}
