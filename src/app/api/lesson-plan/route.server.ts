import fs from "node:fs/promises";
import path from "node:path";
import { fail, readJson, withTeacher } from "@/server/http";
import { getCourse, insertPlan } from "@/server/courses";
import { getContent } from "@/lib/content";
import { lessonInput } from "@/lib/course";
import { lessonKuMap } from "@/lib/lesson-data";
import { parsePromptFile } from "@/lib/lesson-plan";
import { llmConfigFromEnv } from "@/lib/llm";
import { generatePlan } from "@/lib/plan-generator";
import type { PlanEvent } from "@/lib/teacher-types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** 生成教案，以 NDJSON 流式返回（每行一个 PlanEvent）。 */
export async function POST(req: Request) {
  const body = await readJson(req);
  return withTeacher(async (t) => {
    const course = await getCourse(t.id, String(body.courseId ?? ""));
    if (!course) return fail("课程不存在", 404);
    const { kus, graph } = getContent();
    const input = lessonInput(graph, course, lessonKuMap(kus));
    const prompt = parsePromptFile(await fs.readFile(path.join(process.cwd(), "prompts", "lesson-plan.md"), "utf8"));
    const llm = llmConfigFromEnv();
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const send = (e: PlanEvent) => ctrl.enqueue(enc.encode(JSON.stringify(e) + "\n"));
        try {
          const r = await generatePlan(input, prompt, llm, send, { signal: req.signal, chunkDelayMs: llm ? 0 : 15 });
          const plan = await insertPlan(course.id, r.content, r.model, r.source === "llm" ? prompt.version : "template");
          send({ t: "done", plan, source: r.source });
        } catch (e) {
          send({ t: "error", message: (e as Error).message });
        } finally {
          ctrl.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
  });
}
