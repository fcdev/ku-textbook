import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./md";

describe("renderMarkdown", () => {
  it("转义 HTML", () => expect(renderMarkdown("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>"));
  it("标题、粗体、列表", () => {
    expect(renderMarkdown("## 课堂流程\n- **导入**（5 分钟）：a\n  - 子\n- b")).toBe(
      "<h2>课堂流程</h2><ul><li><strong>导入</strong>（5 分钟）：a<ul><li>子</li></ul></li><li>b</li></ul>",
    );
  });
  it("引用和段落", () => expect(renderMarkdown("> 注\n\n一\n二")).toBe("<blockquote>注</blockquote><p>一<br>二</p>"));
});
