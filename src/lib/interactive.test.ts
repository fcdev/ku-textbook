import { describe, expect, it } from "vitest";
import { experimentModels } from "@/experiments/models";
import { lintInteractive, parseOptions, parseSet, preprocessInteractive } from "./interactive";
import { coverage, fillGuess, scoreDrawing } from "./drawit";

describe("interactive", () => {
  it("parseSet", () => {
    expect(parseSet("degree=1; n=10")).toEqual({ degree: 1, n: 10 });
    expect(parseSet("a=true,b=false")).toEqual({ a: true, b: false });
    expect(parseSet("")).toEqual({});
  });
  it("parseOptions", () => {
    expect(parseOptions("A | B|C ")).toEqual(["A", "B", "C"]);
  });
  it("preprocess 给联动组件补上实验 id、preset 和 KU 前缀", () => {
    const src = `<Experiment id="poly-fit" preset="article" ch="fit" />\n现在 <Knob ch="fit" name="degree" /> 阶\n<Stage label="x" ch="fit" set="degree=2">t</Stage>\n<Knob ch="nope" name="degree" />`;
    const out = preprocessInteractive(src, "overfit");
    expect(out).toContain(`<Experiment id="poly-fit" preset="article" ch="overfit/fit" />`);
    expect(out).toContain(`<Knob ch="overfit/fit" exp="poly-fit" preset="article" name="degree" />`);
    expect(out).toContain(`<Stage label="x" ch="overfit/fit" exp="poly-fit" preset="article" set="degree=2">`);
    expect(out).toContain(`<Knob ch="nope" name="degree" />`);
  });
  it("lint 找出错误引用", () => {
    const src = [
      `<Experiment id="poly-fit" preset="article" ch="fit" />`,
      `<Knob ch="fit" name="nope" />`,
      `<Knob ch="other" name="degree" />`,
      `<Stage label="a" ch="fit" set="degree=99">x</Stage>`,
      `<Predict id="p" gate question="q" options="a|b" answer="5">x</Predict>`,
      `<DrawIt id="p" exp="poly-fit" over="degree" metric="bad" question="q">x</DrawIt>`,
    ].join("\n");
    const errs = lintInteractive(src, experimentModels);
    expect(errs.some((e) => e.includes("没有这个参数"))).toBe(true);
    expect(errs.some((e) => e.includes(`ch="other"`))).toBe(true);
    expect(errs.some((e) => e.includes("超出范围"))).toBe(true);
    expect(errs.some((e) => e.includes("gate> 需要 ch"))).toBe(true);
    expect(errs.some((e) => e.includes("answer 超出"))).toBe(true);
    expect(errs.some((e) => e.includes("重复"))).toBe(true);
    expect(errs.some((e) => e.includes("没有指标「bad」"))).toBe(true);
  });
  it("正确的写法没有错误", () => {
    const src = `<Experiment id="descent-2d" preset="article" ch="b" />\n<Knob ch="b" name="lr" />\n<Stage label="a" ch="b" set="lr=0.2; steps=40">x</Stage>\n<Predict id="p" ch="b" gate question="q" options="a|b" answer="1">x</Predict>`;
    expect(lintInteractive(src, experimentModels)).toEqual([]);
  });
});

describe("drawit", () => {
  it("补齐和覆盖率", () => {
    expect(fillGuess([null, 1, null, 3, null])).toEqual([1, 1, 2, 3, 3]);
    expect(fillGuess([null, null])).toBeNull();
    expect(coverage([null, 1, 2, null])).toBe(0.5);
  });
  it("打分：完全一致 100 分，最低点位置", () => {
    const actual = [3, 2, 1, 2, 3];
    const s = scoreDrawing(actual, actual, 2);
    expect(s.score).toBe(100);
    expect(s.actualHasValley).toBe(true);
    expect(s.guessMin).toBe(2);
    const flat = scoreDrawing([3, 2.5, 2, 1.5, 1], actual, 2);
    expect(flat.score).toBeLessThan(100);
    expect(flat.guessMin).toBe(4);
  });
});
