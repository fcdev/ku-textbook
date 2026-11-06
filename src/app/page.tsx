import KnowledgeMap from "@/components/KnowledgeMap";
import { getContent, intuitionText, toMeta } from "@/lib/content";
import { t } from "@/lib/strings";
import { buildIndex } from "@/lib/search";

export default function Home() {
  const { kus } = getContent();
  const metas = kus.map(toMeta);
  // 构建期生成搜索索引，客户端只做匹配
  const index = buildIndex(
    kus.map((k) => ({ id: k.id, title: k.title, summary: k.summary ?? "", tags: Object.values(k.links).flat().join(" "), body: intuitionText(k), chapter: k.chapter })),
  );
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{t.navMap}</h1>
        <p className="text-muted">{t.siteTagline}</p>
      </section>
      <KnowledgeMap kus={metas} index={index} />
    </div>
  );
}
