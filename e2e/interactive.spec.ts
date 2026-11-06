import { expect, test } from "@playwright/test";

test("预测门槛：先预测才能拖实验，掀开看解释", async ({ page }) => {
  await page.goto("/ku/overfit");
  await expect(page.getByText("先在文中做个预测，再来动手试")).toBeVisible();
  // 锁住时实验区是 inert 的（键盘和读屏进不去），正文里的可拖数字也禁用
  await expect(page.locator(".exp-block [inert]")).toHaveCount(1);
  await expect(page.locator(".knob").first()).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("button", { name: "先选一个预测，才能掀开" })).toBeDisabled();

  await page.getByRole("radio", { name: "先变近，再变远" }).click();
  await expect(page.getByText("先在文中做个预测，再来动手试")).toHaveCount(0);
  await expect(page.locator(".exp-block [inert]")).toHaveCount(0);
  await page.getByRole("button", { name: "掀开看为什么" }).click();
  await expect(page.getByText("你的预测是对的。")).toBeVisible();

  // 刷新后预测还在，实验不再上锁
  await page.reload();
  await expect(page.getByText("你的预测是对的。")).toBeVisible();
  await expect(page.getByText("先在文中做个预测，再来动手试")).toHaveCount(0);
});

test("正文可拖数字和实验联动，分段按钮切换实验状态", async ({ page }) => {
  await page.goto("/ku/overfit");
  await page.getByRole("radio", { name: "越来越近" }).click();
  const knobs = page.getByRole("slider", { name: "阶数" });
  // 正文里的数字 + 实验滑块，共两个
  await expect(knobs).toHaveCount(2);
  const knob = page.locator(".knob").first();
  await knob.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await expect(knob).toHaveAttribute("aria-valuetext", "4");
  await expect(page.locator("output").filter({ hasText: /^4$/ }).first()).toBeVisible();

  await page.getByRole("button", { name: /在图上看/ }).nth(2).click();
  await expect(knob).toHaveAttribute("aria-valuetext", "10");
});

test("画出你的预测：画完揭晓并打分", async ({ page }) => {
  await page.goto("/ku/overfit?level=theory");
  const box = page.locator("[data-drawit] svg").first();
  await box.scrollIntoViewIfNeeded();
  const b = (await box.boundingBox())!;
  await page.mouse.move(b.x + 60, b.y + 50);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) await page.mouse.move(b.x + 60 + (i / 20) * (b.width - 80), b.y + 50 + Math.sin((i / 20) * Math.PI) * 100);
  await page.mouse.up();
  await page.getByRole("button", { name: "画好了，揭晓" }).click();
  await expect(page.getByText(/吻合度 \d+ \/ 100/)).toBeVisible();
});

test("实验室：3D / 等高线切换，小网络能训练", async ({ page }) => {
  await page.goto("/play");
  await page.getByRole("button", { name: "等高线" }).first().click();
  await page.getByRole("button", { name: "两个山谷" }).click();
  await page.getByRole("button", { name: "走一步" }).click();
  await expect(page.getByText("步数").first()).toBeVisible();
  await page.getByRole("button", { name: "开始训练" }).click();
  await expect(page.getByText(/轮数\s*[1-9]/)).toBeVisible({ timeout: 10_000 });
});

test("静止模式：开关会记住", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "动效开" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-still", "1");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-still", "1");
  await expect(page.getByRole("button", { name: "动效关" })).toBeVisible();
});
