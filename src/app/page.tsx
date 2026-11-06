import KnowledgeMap from "@/components/KnowledgeMap";
import { getContent, intuitionText, toMeta } from "@/lib/content";
import { t } from "@/lib/strings";

export default function Home() {
  const { kus } = getContent();
  const metas = kus.map(toMeta);
  // 构建期生成搜索文本（标题、摘要、直觉层、章节），客户端只做匹配
  const searchText = Object.fromEntries(
    kus.map((k) => [k.id, [k.title, k.id, k.summary ?? "", k.chapter ? `第${k.chapter}章 ch${k.chapter}` : "", Object.values(k.links).flat().join(" "), intuitionText(k)].join(" ").toLowerCase()]),
  );
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">{t.navMap}</h1>
        <p className="text-muted">{t.siteTagline}</p>
      </section>
      <KnowledgeMap kus={metas} searchText={searchText} />
    </div>
  );
}
