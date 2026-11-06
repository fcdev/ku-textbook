/** 预测记录只存 localStorage（和进度一样，读写失败就当没有）。键是 “页面路径#预测 id”。 */
export interface PredictionRecord { picked: number; revealed: boolean; at: string }
const KEY = "ku-predict-v1";

export function readPredictions(): Record<string, PredictionRecord> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function writePrediction(key: string, rec: PredictionRecord | null) {
  try {
    const all = readPredictions();
    if (rec) all[key] = rec;
    else delete all[key];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 忽略 */
  }
}
