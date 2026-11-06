/** 学生进度只存 localStorage；任何读写失败都静默降级为“没有进度”（SPEC §5.4）。 */
export interface KuProgress { done: boolean; xp: number; lastQuiz: string }
export type Progress = Record<string, KuProgress>;

const KEY = "ku-progress-v1";
const EVENT = "ku-progress";

export function readProgress(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === "object" ? (v as Progress) : {};
  } catch {
    return {};
  }
}

export function writeProgress(id: string, p: KuProgress): void {
  try {
    const all = readProgress();
    const prev = all[id];
    all[id] = { done: p.done || !!prev?.done, xp: Math.max(p.xp, prev?.xp ?? 0), lastQuiz: p.lastQuiz };
    window.localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* 隐私模式等情况下写不进去，忽略 */
  }
}

export function subscribeProgress(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
