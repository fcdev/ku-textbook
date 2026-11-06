import { describe, expect, it } from "vitest";
import { experimentModels } from "@/experiments/models";
import { defaultParams, paramValues, type Params } from "@/experiments/types";
import { readAllKus } from "./content";
import { gradeCheck } from "./quiz";

/** 每道实验题：默认状态不能直接答对，并且在可见滑块的取值网格里一定有解。 */
describe("内容里的实验题都可解", () => {
  const kus = readAllKus();
  for (const ku of kus) {
    for (const q of ku.quiz) {
      if (q.type !== "experiment-target") continue;
      it(`${ku.id}/${q.id}`, () => {
        const model = experimentModels[q.experiment.id];
        const preset = model.presets[q.experiment.preset];
        const seed = preset.seed ?? 1;
        const base = defaultParams(model, q.experiment.preset);
        const keys = (preset.visibleControls ?? model.params.map((p) => p.key)).filter((k) => model.params.some((p) => p.key === k && p.kind !== "bool"));
        const state = (params: Params) => ({ params, metrics: model.compute(params, seed) });
        expect(gradeCheck(q.check, state(base), model, seed), "默认状态不应直接答对").toBe(false);
        let combos: Params[] = [base];
        for (const k of keys) {
          const spec = model.params.find((p) => p.key === k)!;
          combos = combos.flatMap((c) => paramValues(spec).map((v) => ({ ...c, [k]: v })));
        }
        expect(combos.some((c) => gradeCheck(q.check, state(c), model, seed)), "找不到能答对的参数").toBe(true);
      });
    }
  }
});
