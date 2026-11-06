import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const url of ["/", "/ku/overfit", "/ku/overfit/practice", "/ku/gd/lab", "/path/l2", "/teacher/login"]) {
  test(`无严重可访问性问题：${url}`, async ({ page }) => {
    await page.goto(url);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`)).toEqual([]);
  });
}
