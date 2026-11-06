/**
 * 极简 Markdown → HTML，只支持教案用到的语法：# / ## / ### 标题、- 列表（两级）、**粗体**、> 引用、段落。
 * 先转义 HTML，输出可安全地用 dangerouslySetInnerHTML。
 */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");

export function renderMarkdown(md: string): string {
  const out: string[] = [];
  let list = 0; // 当前打开的 <ul> 层数
  const closeLists = (to = 0) => { while (list > to) { out.push("</li></ul>"); list--; } };
  let para: string[] = [];
  const flush = () => { if (para.length) { out.push(`<p>${para.map(inline).join("<br>")}</p>`); para = []; } };
  for (const raw of md.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const li = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (h) { flush(); closeLists(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
    else if (li) {
      flush();
      const depth = li[1].length >= 2 ? 2 : 1;
      if (depth > list) { while (list < depth) { out.push("<ul><li>"); list++; } }
      else { closeLists(depth); out.push("</li><li>"); }
      out.push(inline(li[2]));
    }
    else if (line.startsWith(">")) { flush(); closeLists(); out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`); }
    else if (!line.trim()) { flush(); closeLists(); }
    else { closeLists(); para.push(line); }
  }
  flush(); closeLists();
  return out.join("").replace(/<ul><li><\/li><li>/g, "<ul><li>");
}
