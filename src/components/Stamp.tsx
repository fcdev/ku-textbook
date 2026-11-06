"use client";
import Link from "next/link";
import { useProgress } from "./useProgress";
import { t } from "@/lib/strings";

/** 闯关完成的印章：圆形邮戳，中间是知识点名，下面是日期。 */
export function Stamp({ title, date, size = 120, animate }: { title: string; date?: string; size?: number; animate?: boolean }) {
  const d = date ? new Date(date) : null;
  const ds = d && !Number.isNaN(+d) ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : "";
  const fs = title.length > 6 ? 13 : title.length > 4 ? 16 : 19;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={animate ? "stamp" : undefined} style={animate ? undefined : { transform: "rotate(-8deg)" }}
      role="img" aria-label={`印章：${title}${ds ? `，${ds}` : ""}`}>
      <g fill="none" stroke="var(--color-bad)" strokeWidth={3} opacity={0.9}>
        <circle cx={60} cy={60} r={54} />
        <circle cx={60} cy={60} r={46} strokeWidth={1.5} />
      </g>
      <text x={60} y={36} textAnchor="middle" fontSize={10} letterSpacing={3} fill="var(--color-bad)" fontWeight={700}>KU · 已掌握</text>
      <text x={60} y={66} textAnchor="middle" fontSize={fs} fill="var(--color-bad)" fontWeight={800} style={{ fontFamily: "var(--font-display)" }}>{title}</text>
      <line x1={26} x2={94} y1={76} y2={76} stroke="var(--color-bad)" strokeWidth={1.2} />
      <text x={60} y={92} textAnchor="middle" fontSize={10} fill="var(--color-bad)" className="mono">{ds || "★ ★ ★"}</text>
    </svg>
  );
}

/** KU 页头右侧：学完了就盖个章。 */
export function KuStamp({ id, title }: { id: string; title: string }) {
  const p = useProgress()[id];
  if (!p?.done) return null;
  return <div className="pointer-events-none absolute -top-2 right-0 hidden sm:block"><Stamp title={title} date={p.lastQuiz} size={96} /></div>;
}

/** 地图页的印章册。 */
export function StampShelf({ kus }: { kus: { id: string; title: string; status: string }[] }) {
  const progress = useProgress();
  const ready = kus.filter((k) => k.status !== "planned");
  const got = ready.filter((k) => progress[k.id]?.done);
  return (
    <section className="space-y-2 rounded-[var(--radius-ku)] border border-line bg-surface p-4" aria-label={t.stampsTitle}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">{t.stampsTitle}</h2>
        <span className="text-sm text-muted">{t.stampsCount(got.length, ready.length)}</span>
      </div>
      {got.length === 0 ? (
        <p className="text-sm text-muted">{t.stampsEmpty}</p>
      ) : null}
      <ul className="flex flex-wrap gap-2">
        {ready.map((k) => {
          const p = progress[k.id];
          return (
            <li key={k.id}>
              <Link href={p?.done ? `/ku/${k.id}` : `/ku/${k.id}/practice`} className="block no-underline" aria-label={`${k.title}${p?.done ? "，已获得印章" : "，还没获得印章，去闯关"}`}>
                {p?.done ? (
                  <Stamp title={k.title} date={p.lastQuiz} size={84} />
                ) : (
                  <svg width={84} height={84} viewBox="0 0 120 120" aria-hidden>
                    <circle cx={60} cy={60} r={54} fill="none" stroke="var(--color-line-strong)" strokeWidth={2} strokeDasharray="5 6" />
                    <text x={60} y={66} textAnchor="middle" fontSize={k.title.length > 6 ? 13 : 16} fill="var(--color-muted)">{k.title}</text>
                  </svg>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
