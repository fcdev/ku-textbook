import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("老师注册 → 组课 → 生成教案 → 编辑 → 导出 → 投屏", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "教师端主要在桌面用，只在桌面跑一遍");
  page.on("dialog", (d) => d.accept());
  const account = `t${Date.now()}@example.com`;

  await page.goto("/teacher");
  await expect(page).toHaveURL(/teacher\/login/);
  await page.getByRole("button", { name: "没有账号？用邀请码注册" }).click();
  await page.getByLabel("邀请码").fill("WRONG");
  await page.getByLabel("姓名").fill("王老师");
  await page.getByLabel("学校").fill("第一中学");
  await page.getByLabel("手机号或邮箱").fill(account);
  await page.getByLabel(/密码/).fill("password123");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  await expect(page.locator("form [role=alert]")).toContainText("邀请码无效");
  await page.getByLabel("邀请码").fill("KU-E2E");
  await page.getByRole("button", { name: "注册", exact: true }).click();

  await page.getByRole("button", { name: "+ 新建课程" }).click();
  await expect(page).toHaveURL(/teacher\/course\?id=/);
  await page.getByLabel("课程名称").fill("过拟合入门");
  await page.getByRole("checkbox", { name: "过拟合与欠拟合", exact: true }).check();
  await page.getByRole("checkbox", { name: "学习率", exact: true }).check();
  const order = page.getByRole("region", { name: "课程顺序" });
  await expect(order.getByText("自动补充前置").first()).toBeVisible();
  await order.getByRole("listitem").filter({ hasText: "一元线性回归" }).getByRole("checkbox", { name: "已学" }).check();
  await page.getByRole("group", { name: "课时" }).getByRole("button", { name: "2 × 45 分钟" }).click();

  await page.getByRole("button", { name: "生成教案 →" }).click();
  await expect(page).toHaveURL(/teacher\/plan/);
  await expect(page.getByText("课堂流程合计 90 分钟")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "课堂流程" })).toBeVisible();

  await page.getByRole("button", { name: "编辑" }).click();
  const ta = page.getByLabel("教案 Markdown");
  await ta.fill((await ta.inputValue()) + "\n老师补充：下课前收手机。\n");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(page.getByText("✓ 已保存")).toBeVisible();

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "导出 Markdown" }).click()]);
  const md = fs.readFileSync((await dl.path())!, "utf8");
  expect(md).toContain("## 教学目标");
  expect(md).toContain("老师补充：下课前收手机。");

  await page.reload();
  await expect(page.getByText(/已手动修改/)).toBeVisible();

  await page.getByRole("link", { name: "投屏" }).click();
  await expect(page).toHaveURL(/present\?course=/);
  const nav = page.getByRole("navigation", { name: "翻页" });
  await expect(nav).toContainText("1 /");
  await page.keyboard.press("ArrowRight");
  await expect(nav).toContainText("2 /");
});

test("未登录访问接口返回 401", async ({ request }) => {
  expect((await request.get("/api/courses")).status()).toBe(401);
  expect((await request.post("/api/lesson-plan", { data: { courseId: "x" } })).status()).toBe(401);
});
