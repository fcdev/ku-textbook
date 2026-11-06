import Link from "next/link";
import { notFound } from "next/navigation";
import KuTabs from "@/components/KuTabs";
import { KuStamp } from "@/components/Stamp";
import { getContent, getKu } from "@/lib/content";
import { t } from "@/lib/strings";

export const dynamicParams = false;

export function generateStaticParams() {
  return getContent().kus.map((k) => ({ id: k.id }));
}

export default async function KuLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ku = getKu(id);
  if (!ku) notFound();
  const { graph } = getContent();
  const ready = ku.status !== "planned";
  return (
    <article className="space-y-6">
      <header className="relative space-y-3">
        <KuStamp id={ku.id} title={ku.title} />
        <h1 className="text-3xl font-bold md:text-4xl">{ku.title}</h1>
        {ku.summary && <p className="text-lg text-muted">{ku.summary}</p>}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {ku.prerequisites.length > 0 && <span className="text-muted">{t.prerequisites}</span>}
          {ku.prerequisites.map((p) => (
            <Link key={p} href={`/ku/${p}`} className="rounded-full border border-line bg-surface px-2.5 py-1 text-ink no-underline hover:border-primary">
              {graph.byId.get(p)!.title}
            </Link>
          ))}
          {Object.entries(ku.links).flatMap(([subject, items]) =>
            items.map((i) => (
              <span key={`${subject}-${i}`} className="rounded-full bg-surface-2 px-2.5 py-1 text-ink-2">
                {subject === "math" ? "数学" : subject === "physics" ? "物理" : subject} · {i}
              </span>
            )),
          )}
          {ku.estMinutes && <span className="ml-auto text-muted">{t.minutes(ku.estMinutes)}</span>}
        </div>
        {ready && <KuTabs id={ku.id} hasExperiment={!!ku.experiment} hasQuiz={ku.quiz.length > 0} />}
      </header>
      {children}
    </article>
  );
}
