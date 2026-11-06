import { expect, test } from "@playwright/test";

test("地图 → 选目标 → 学习路径", async ({ page, isMobile }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("正则化");
  if (isMobile) await page.getByRole("button", { name: /L2 正则化/ }).first().click();
  else await page.getByRole("button", { name: "L2 正则化" }).click();
  const path = page.getByRole("region", { name: /学习路径 · L2 正则化/ });
  await expect(path.getByRole("listitem")).toHaveCount(7);
  await expect(path.getByRole("listitem").last()).toContainText("L2 正则化");
  await path.getByRole("link", { name: "打开学习路径页 →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("从零学到「L2 正则化」");
  await page.getByRole("link", { name: /开始学/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("一元线性回归");
});

test("搜索章节", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("第 6 章");
  await expect(page.getByText("没有找到相关的知识点")).toHaveCount(0);
});

test("闯关：过拟合四题答完，进度写入", async ({ page }) => {
  await page.goto("/ku/overfit/practice");
  const slider = page.getByRole("slider", { name: "阶数" });
  const check = page.getByRole("button", { name: "检查" });

  // 第 1 题先答错，再答对
  await check.click();
  await expect(page.locator("div[role=status]")).toContainText("还差一点");
  await page.getByRole("button", { name: "再试一次" }).click();
  await slider.fill("9");
  await check.click();
  await expect(page.locator("div[role=status]")).toContainText("答对了");
  await page.getByRole("button", { name: "继续" }).click();

  // 第 2 题：试几个阶数找测试误差最小的
  for (const d of [3, 4, 5, 2, 6]) {
    await slider.fill(String(d));
    await check.click();
    if (await page.locator("div[role=status]").getByText("答对了").count()) break;
    await page.getByRole("button", { name: "再试一次" }).click();
  }
  await page.getByRole("button", { name: "继续" }).click();

  await page.getByRole("radio", { name: "过拟合" }).click();
  await check.click();
  await page.getByRole("button", { name: "继续" }).click();
  await page.getByRole("radio", { name: "9 次" }).click();
  await check.click();
  await page.getByRole("button", { name: "继续" }).click();

  await expect(page.getByText("+40 XP")).toBeVisible();
  await expect(page.getByText(/解锁下一个知识点：.*L2 正则化/)).toBeVisible();
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("ku-progress-v1") ?? "{}"));
  expect(progress.overfit.done).toBe(true);
});

test("学习率闯关：实验题用键盘也能答", async ({ page }) => {
  await page.goto("/ku/lr/practice");
  const slider = page.getByRole("slider", { name: "学习率 η" });
  await slider.focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight"); // 0.01 → 0.3
  await page.getByRole("button", { name: "检查" }).click();
  await expect(page.locator("div[role=status]")).toContainText("答对了");
});

test("文章：直觉 / 原理切换并同步到地址", async ({ page }) => {
  await page.goto("/ku/gd");
  await page.getByRole("button", { name: "原理" }).click();
  await expect(page).toHaveURL(/level=theory/);
  await expect(page.getByRole("heading", { name: "更新公式" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "蒙着眼下山" })).toBeHidden();
});
