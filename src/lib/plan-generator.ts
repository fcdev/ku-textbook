/**
 * 教案生成流程（SPEC §6.3）：调大模型流式输出 → 校验小节和分钟数 → 不对就重试一次 → 再不对用模板兜底。
 * 没有配置大模型时直接用模板。通过 emit 推送事件，服务端转成 NDJSON 流，演示模式在浏览器里直接用。
 */
import { fillPrompt, templatePlan, validatePlan, type LessonInput } from "./lesson-plan";
import { streamChat, type LlmConfig } from "./llm";

export type GenEvent = { t: "delta"; text: string } | { t: "reset"; reason: string };

export interface GenResult {
  content: string;
  source: "llm" | "template";
  model: string;
}

export async function generatePlan(
  input: LessonInput,
  prompt: { system: string; user: string },
  llm: LlmConfig | null,
  emit: (e: GenEvent) => void,
  opts: { fetchImpl?: typeof fetch; chunkDelayMs?: number; signal?: AbortSignal } = {},
): Promise<GenResult> {
  if (llm) {
    const messages = [
      { role: "system" as const, content: prompt.system },
      { role: "user" as const, content: fillPrompt(prompt.user, input) },
    ];
    for (let attempt = 0; attempt < 2; attempt++) {
      let text = "";
      try {
        for await (const d of streamChat(llm, messages, { fetchImpl: opts.fetchImpl, signal: opts.signal })) {
          text += d;
          emit({ t: "delta", text: d });
        }
        const v = validatePlan(text, input);
        if (v.ok) return { content: text.trim() + "\n", source: "llm", model: llm.model };
        emit({ t: "reset", reason: attempt === 0 ? `格式不对（${v.errors[0]}），重新生成一次` : `仍然不对（${v.errors[0]}），改用模板生成` });
      } catch (e) {
        emit({ t: "reset", reason: `大模型调用失败：${(e as Error).message.slice(0, 80)}${attempt === 0 ? "，重试一次" : "，改用模板生成"}` });
      }
    }
  }
  const content = templatePlan(input);
  // 模板也按段流式推送，前端只有一种显示逻辑
  for (const chunk of content.match(/[\s\S]{1,24}/g) ?? []) {
    emit({ t: "delta", text: chunk });
    if (opts.chunkDelayMs) await new Promise((r) => setTimeout(r, opts.chunkDelayMs));
  }
  return { content, source: "template", model: "template" };
}
