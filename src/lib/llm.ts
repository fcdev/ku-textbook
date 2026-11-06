/**
 * OpenAI 兼容的 Chat Completions 客户端（流式）。国内上线时把 LLM_BASE_URL 指向已备案的模型服务即可。
 * 不依赖任何 SDK，只用 fetch。
 */
export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function llmConfigFromEnv(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const { LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = env;
  if (!LLM_BASE_URL || !LLM_MODEL) return null;
  return { baseUrl: LLM_BASE_URL.replace(/\/+$/, ""), apiKey: LLM_API_KEY ?? "", model: LLM_MODEL };
}

/** 流式调用，逐段产出文本。服务端返回非 2xx 时抛错。 */
export async function* streamChat(
  cfg: LlmConfig,
  messages: ChatMessage[],
  opts: { signal?: AbortSignal; temperature?: number; fetchImpl?: typeof fetch } = {},
): AsyncGenerator<string> {
  const res = await (opts.fetchImpl ?? fetch)(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
    body: JSON.stringify({ model: cfg.model, messages, stream: true, temperature: opts.temperature ?? 0.4 }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) throw new Error(`大模型接口返回 ${res.status}：${(await res.text().catch(() => "")).slice(0, 200)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        /* 忽略无法解析的行（心跳等） */
      }
    }
  }
}
