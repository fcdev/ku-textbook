import { describe, expect, it } from "vitest";
import { buildGraph, closure, GraphError, layers, learningPath, successors, topoSort } from "./graph";

const n = (id: string, prerequisites: string[] = []) => ({ id, title: id, prerequisites });

const sample = () =>
  buildGraph([
    n("supervised"),
    n("linreg", ["supervised"]),
    n("split", ["supervised"]),
    n("loss", ["linreg"]),
    n("lsq", ["loss"]),
    n("gd", ["loss"]),
    n("overfit", ["lsq", "split"]),
    n("l2", ["overfit"]),
    n("early", ["overfit", "gd"]),
  ]);

describe("buildGraph", () => {
  it("计算层号 = 最长前置链长度", () => {
    const g = sample();
    expect(g.depth.get("supervised")).toBe(0);
    expect(g.depth.get("split")).toBe(1);
    expect(g.depth.get("overfit")).toBe(4);
    expect(g.depth.get("early")).toBe(5);
  });
  it("重复 id 报错", () => {
    expect(() => buildGraph([n("a"), n("a")])).toThrow(/重复/);
  });
  it("前置不存在报错", () => {
    expect(() => buildGraph([n("a", ["ghost"])])).toThrow(/不存在/);
  });
  it("有环时报错并给出环", () => {
    try {
      buildGraph([n("a", ["c"]), n("b", ["a"]), n("c", ["b"])]);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(GraphError);
      const ids = (e as GraphError).ids;
      expect(ids[0]).toBe(ids[ids.length - 1]);
      expect(new Set(ids)).toEqual(new Set(["a", "b", "c"]));
    }
  });
  it("自环报错", () => {
    expect(() => buildGraph([n("a", ["a"])])).toThrow();
  });
});

describe("closure / topoSort", () => {
  it("闭包包含全部传递前置", () => {
    expect(closure(sample(), ["overfit"])).toEqual(new Set(["overfit", "lsq", "split", "loss", "linreg", "supervised"]));
  });
  it("拓扑序中前置一定在前", () => {
    const g = sample();
    const order = topoSort(g, closure(g, ["early", "l2"]));
    for (const id of order) for (const p of g.byId.get(id)!.prerequisites) expect(order.indexOf(p)).toBeLessThan(order.indexOf(id));
  });
  it("排序稳定：同层按原始顺序", () => {
    const g = sample();
    expect(topoSort(g, ["split", "linreg"])).toEqual(["linreg", "split"]);
  });
  it("未知 id 报错", () => {
    expect(() => closure(sample(), ["nope"])).toThrow(GraphError);
  });
});

describe("learningPath", () => {
  it("去掉已完成的前置，但保留目标", () => {
    expect(learningPath(sample(), "overfit", ["supervised", "linreg", "overfit"])).toEqual(["split", "loss", "lsq", "overfit"]);
  });
});

describe("layers", () => {
  it("每个节点恰好出现一次，层号与 depth 一致", () => {
    const g = sample();
    const cols = layers(g);
    expect(cols.flat().sort()).toEqual(g.nodes.map((x) => x.id).sort());
    cols.forEach((col, i) => col.forEach((id) => expect(g.depth.get(id)).toBe(i)));
  });
});

describe("successors", () => {
  it("返回直接后继", () => {
    expect(successors(sample(), "overfit").sort()).toEqual(["early", "l2"]);
  });
});
