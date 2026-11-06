import { describe, expect, it } from "vitest";
import { templatePlan, type LessonInput } from "./lesson-plan";
import { generatePlan, type GenEvent } from "./plan-generator";

const input: LessonInput = {
  courseTitle: "t", learned: [], stage: "高中", periods: 1, subject: "数学",
  kus: [{ id: "gd", title: "梯度下降", summary: "下山。", intuition: "蒙眼下山。", links: {}, quiz: [{ id: "q1", prompt: "p" }], hasExperiment: true, estMinutes: 8 }],
};
const prompt = { system: "s", user: "{{kus}}" };
const llm = { baseUrl: "http://llm.test/v1", apiKey: "k", model: "m-1" };

/** 假的 OpenAI 兼容服务：按顺序返回给定的完整文本，分成几段 SSE。 */
function fakeFetch(replies: (string | number)[]) {
  const calls: unknown[] = [];
  const f = (async (_url: string, init: RequestInit) => {
    calls.push(JSON.parse(String(init.body)));
    const r = replies.shift()!;
    if (typeof r === "number") return new Response("boom", { status: r });
    const chunks = r.match(/[\s\S]{1,10}/g)!.map((c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`);
    const body = new ReadableStream({ start(c) { for (const x of [...chunks, "data: [DONE]\n\n"]) c.enqueue(new TextEncoder().encode(x)); c.close(); } });
    return new Response(body, { status: 200 });
  }) as unknown as typeof fetch;
  return { f, calls };
}

const run = async (replies: (string | number)[]) => {
  const ev: GenEvent[] = [];
  const { f, calls } = fakeFetch(replies);
  const r = await generatePlan(input, prompt, llm, (e) => ev.push(e), { fetchImpl: f });
  return { r, ev, calls };
};

describe("generatePlan", () => {
  const good = templatePlan(input);
  it("大模型第一次就合格", async () => {
    const { r, ev, calls } = await run([good]);
    expect(r).toMatchObject({ source: "llm", model: "m-1" });
    expect(ev.filter((e) => e.t === "delta").map((e) => (e as { text: string }).text).join("")).toBe(good);
    expect(calls).toHaveLength(1);
    expect((calls[0] as { stream: boolean }).stream).toBe(true);
  });
  it("第一次不合格，重试后合格", async () => {
    const { r, ev, calls } = await run(["## 教学目标\n胡说", good]);
    expect(r.source).toBe("llm");
    expect(ev.some((e) => e.t === "reset")).toBe(true);
    expect(calls).toHaveLength(2);
  });
  it("两次都不合格，用模板兜底", async () => {
    const { r } = await run(["x", "y"]);
    expect(r).toMatchObject({ source: "template", content: good });
  });
  it("接口报错也会兜底", async () => {
    const { r, ev } = await run([500, 502]);
    expect(r.source).toBe("template");
    expect(ev.filter((e) => e.t === "reset")).toHaveLength(2);
  });
  it("没有配置大模型时直接用模板", async () => {
    const r = await generatePlan(input, prompt, null, () => {});
    expect(r.source).toBe("template");
  });
});
