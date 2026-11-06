import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { fillPrompt, flowMinutes, parsePromptFile, requiredSections, section, splitMinutes, templatePlan, validatePlan, type LessonInput } from "./lesson-plan";

const ku = (id: string, title: string) => ({
  id, title, summary: `${title}的摘要。`, intuition: `${title}的直觉层第一句。第二句。`, links: { math: ["函数"] },
  quiz: [{ id: "q1", prompt: "题目一" }], hasExperiment: true, estMinutes: 8,
});
const input = (o: Partial<LessonInput> = {}): LessonInput => ({
  courseTitle: "过拟合入门", kus: [ku("loss", "损失函数"), ku("overfit", "过拟合与欠拟合")], learned: ["一元线性回归"], stage: "高中", periods: 1, subject: "数学", ...o,
});

describe("splitMinutes", () => {
  it("整数且和不变", () => {
    for (const [t, n] of [[30, 4], [7, 3], [45, 1], [90, 7]]) {
      const s = splitMinutes(t, n);
      expect(s.length).toBe(n);
      expect(s.reduce((a, b) => a + b, 0)).toBe(t);
      expect(Math.max(...s) - Math.min(...s)).toBeLessThanOrEqual(1);
    }
  });
});

describe("templatePlan", () => {
  for (const periods of [1, 2]) for (const subject of ["数学", "物理", "无"] as const) for (const n of [0, 1, 2, 6]) {
    it(`${periods} 课时 · ${subject} · ${n} 个 KU 时通过校验`, () => {
      const kus = Array.from({ length: n }, (_, i) => ku(`k${i}`, `知识点${i}`));
      const md = templatePlan(input({ periods, subject, kus }));
      expect(validatePlan(md, { periods, subject })).toEqual({ ok: true, errors: [] });
    });
  }
  it("引用题目编号", () => {
    expect(templatePlan(input())).toContain("[overfit/q1]");
  });
});

describe("validatePlan", () => {
  it("缺小节、分钟数不对都报错", () => {
    const md = "## 教学目标\n## 课堂流程\n- **导入**（5 分钟）：x\n- **讲**（30 分钟）：y\n  - 子条目（10 分钟）不算\n";
    const r = validatePlan(md, { periods: 1, subject: "物理" });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toMatch(/课前准备/);
    expect(r.errors.join()).toMatch(/和物理课的连接/);
    expect(r.errors.join()).toMatch(/35，应为 45/);
  });
  it("支持半角括号", () => {
    expect(flowMinutes("## 课堂流程\n- **a**(40 分钟)：x\n- **b** (5分钟)：y")).toEqual([40, 5]);
  });
  it("section 只取到下一个二级标题", () => {
    expect(section("## A\n1\n### sub\n2\n## B\n3", "A")).toBe("1\n### sub\n2");
  });
});

describe("prompt", () => {
  const p = parsePromptFile(fs.readFileSync("prompts/lesson-plan.md", "utf8"));
  it("有版本号和两段", () => {
    expect(p.version).toMatch(/^lesson-plan@\d+$/);
    expect(p.system.length).toBeGreaterThan(20);
    expect(p.user).toContain("{{kus}}");
  });
  it("填充后没有遗留占位符，且包含所有小节名", () => {
    const filled = fillPrompt(p.user, input({ subject: "物理" }));
    expect(filled).not.toMatch(/\{\{/);
    for (const h of requiredSections("物理")) expect(filled).toContain(`## ${h}`);
    expect(filled).toContain("[overfit/q1]");
  });
});
