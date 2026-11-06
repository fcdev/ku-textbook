import { describe, expect, it } from "vitest";
import { buildGraph } from "./graph";
import { courseItems, lessonInput } from "./course";

const g = buildGraph([
  { id: "a", title: "A", prerequisites: [] },
  { id: "b", title: "B", prerequisites: ["a"] },
  { id: "c", title: "C", prerequisites: ["b"] },
  { id: "d", title: "D", prerequisites: ["a"] },
]);

describe("courseItems", () => {
  it("自动补齐前置并标记", () => {
    expect(courseItems(g, ["c", "d"], ["a"])).toEqual([
      { id: "a", auto: true, learned: true },
      { id: "b", auto: true, learned: false },
      { id: "d", auto: false, learned: false },
      { id: "c", auto: false, learned: false },
    ]);
  });
  it("忽略不存在的 id", () => {
    expect(courseItems(g, ["zzz", "a"], [])).toEqual([{ id: "a", auto: false, learned: false }]);
  });
});

describe("lessonInput", () => {
  it("只包含未学且有内容的 KU", () => {
    const lk = (id: string) => ({ id, title: id.toUpperCase(), summary: "", intuition: "", links: {}, quiz: [], hasExperiment: false, estMinutes: 5 });
    const r = lessonInput(g, { title: "t", kuIds: ["c"], learnedKuIds: ["a"], stage: "高中", periods: 1, subject: "无" }, { b: lk("b"), c: lk("c") });
    expect(r.kus.map((k) => k.id)).toEqual(["b", "c"]);
    expect(r.learned).toEqual(["A"]);
  });
});
