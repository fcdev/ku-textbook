/**
 * 客户端搜索。索引在构建期生成（每个 KU 一条：标题、摘要、跨学科标签、直觉层正文、章节），
 * 查询时按命中位置打分。几百个 KU 以内不需要倒排索引（见 docs/DECISIONS.md）。
 */
export interface SearchDoc {
  id: string;
  title: string;
  summary: string;
  tags: string;
  body: string;
  chapter?: number;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·，。、“”"'（）()]/g, "");

export function buildIndex(docs: SearchDoc[]): SearchDoc[] {
  return docs.map((d) => ({ ...d, title: norm(d.title), summary: norm(d.summary), tags: norm(d.tags), body: norm(d.body) }));
}

/** 返回按相关度排序的 id。“第 8 章”“ch8”“8章”按章节匹配。空查询返回 null（表示不过滤）。 */
export function search(index: SearchDoc[], query: string): string[] | null {
  const q = norm(query);
  if (!q) return null;
  const ch = q.match(/^(?:第|ch)?(\d+)章?$/);
  if (ch) return index.filter((d) => d.chapter === Number(ch[1])).map((d) => d.id);
  const scored: [string, number][] = [];
  for (const d of index) {
    let s = 0;
    if (d.id === q) s += 100;
    if (d.title.includes(q)) s += d.title.startsWith(q) ? 60 : 50;
    if (d.id.includes(q)) s += 20;
    if (d.tags.includes(q)) s += 15;
    if (d.summary.includes(q)) s += 10;
    if (d.body.includes(q)) s += 5;
    if (s > 0) scored.push([d.id, s]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
