import Link from "next/link";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import LevelSwitch from "@/components/LevelSwitch";
import { mdxComponents, preprocessFormulas } from "@/components/mdx";
import { getContent, getKu } from "@/lib/content";
import { t } from "@/lib/strings";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const ku = getKu((await params).id);
  return ku ? { title: ku.title, description: ku.summary } : {};
}

export default async function KuArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ku = getKu(id);
  if (!ku) notFound();

  if (ku.status === "planned") {
    const { graph } = getContent();
    return (
      <div className="space-y-3 rounded-[var(--radius-ku)] border border-dashed border-line bg-surface p-6">
        <p className="font-bold">{t.comingSoon}</p>
        <p className="text-muted">{t.plannedBody}</p>
        <ul className="flex flex-wrap gap-2">
          {ku.prerequisites.map((p) => (
            <li key={p}><Link href={`/ku/${p}`}>{graph.byId.get(p)!.title}</Link></li>
          ))}
          {ku.prerequisites.length === 0 && <li><Link href="/">{t.navMap}</Link></li>}
        </ul>
      </div>
    );
  }

  const { content } = await compileMDX({
    source: preprocessFormulas(ku.body),
    components: mdxComponents,
    options: { mdxOptions: { remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [rehypeKatex] } },
  });

  return (
    <div className="space-y-8">
      <LevelSwitch hasTheory={/<Theory>/.test(ku.body)}>{content}</LevelSwitch>
      <footer className="space-y-4 border-t border-line pt-6">
        {ku.quiz.length > 0 && (
          <Link href={`/ku/${ku.id}/practice`} className="inline-flex min-h-12 items-center rounded-xl bg-accent px-6 font-bold text-surface no-underline">
            {t.goPractice} · {ku.quiz.length} 题 →
          </Link>
        )}
        {ku.reading.length > 0 && (
          <div className="text-sm text-muted">
            {t.reading}：
            {ku.reading.map((r, i) => (
              <span key={i}>{i > 0 && "；"}{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}</span>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}
