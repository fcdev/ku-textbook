import { describe, expect, it } from "vitest";
import { buildIndex, search } from "./search";

const idx = buildIndex([
  { id: "l2", title: "L2 正则化", summary: "惩罚过大的参数", tags: "数学 平方和", body: "给模型加一条规矩", chapter: 9 },
  { id: "dropout", title: "Dropout", summary: "随机丢弃神经元", tags: "", body: "也是一种正则化", chapter: 9 },
  { id: "gd", title: "梯度下降", summary: "蒙着眼下山", tags: "导数", body: "坡度", chapter: 6 },
]);

describe("search", () => {
  it("空查询返回 null", () => expect(search(idx, "  ")).toBeNull());
  it("标题命中排在正文命中前面", () => expect(search(idx, "正则化")).toEqual(["l2", "dropout"]));
  it("忽略大小写和空格", () => expect(search(idx, "drop OUT")).toEqual(["dropout"]));
  it("按章节搜索", () => {
    expect(search(idx, "第 9 章")).toEqual(["l2", "dropout"]);
    expect(search(idx, "ch6")).toEqual(["gd"]);
  });
  it("跨学科标签能搜到", () => expect(search(idx, "导数")).toEqual(["gd"]));
  it("没有结果返回空数组", () => expect(search(idx, "量子")).toEqual([]));
});
