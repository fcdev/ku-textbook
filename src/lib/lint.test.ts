import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lintContent } from "./lint";

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ku-lint-"));
  for (const [p, c] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    fs.writeFileSync(path.join(root, p), c);
  }
  return root;
}
const fm = (id: string, extra = "") => `---\nid: ${id}\ntitle: ${id}\nstatus: planned\n${extra}---\n`;
const errors = (root: string) => lintContent(root).issues.filter((i) => i.level === "error").map((i) => i.message).join("\n");

describe("ku-lint", () => {
  it("真实内容目录没有错误", () => {
    expect(errors(path.resolve("content/ku"))).toBe("");
  });
  it("id 与目录名不一致", () => {
    expect(errors(fixture({ "a/index.mdx": fm("b") }))).toMatch(/必须等于目录名/);
  });
  it("前置不存在", () => {
    expect(errors(fixture({ "a/index.mdx": fm("a", "prerequisites: [zzz]\n") }))).toMatch(/不存在/);
  });
  it("成环", () => {
    const root = fixture({ "a/index.mdx": fm("a", "prerequisites: [b]\n"), "b/index.mdx": fm("b", "prerequisites: [a]\n") });
    expect(errors(root)).toMatch(/成环/);
  });
  it("summary 超过 40 字", () => {
    expect(errors(fixture({ "a/index.mdx": fm("a", `summary: ${"字".repeat(41)}\n`) }))).toMatch(/40/);
  });
  it("未知实验", () => {
    expect(errors(fixture({ "a/index.mdx": fm("a", "experiment: nope\n") }))).toMatch(/registry/);
  });
  it("题目引用不存在的指标和图层", () => {
    const root = fixture({
      "a/index.mdx": fm("a"),
      "a/quiz.yaml": `- id: q1\n  type: experiment-target\n  prompt: x\n  experiment: { id: poly-fit, hide: [ghost] }\n  check: { metric: acc, op: ">", value: 1 }\n`,
    });
    const e = errors(root);
    expect(e).toMatch(/没有指标「acc」/);
    expect(e).toMatch(/图层「ghost」/);
  });
  it("已发布的 KU 少于 3 道题", () => {
    const root = fixture({ "a/index.mdx": `---\nid: a\ntitle: a\nsummary: s\nestMinutes: 3\nstatus: published\n---\n<Intuition>x</Intuition>` });
    expect(errors(root)).toMatch(/至少要 3 道题/);
  });
});
