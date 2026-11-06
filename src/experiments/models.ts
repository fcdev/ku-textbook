/** 纯数据的实验注册表（无 React），给 ku-lint、判分和服务端用。客户端组件见 registry.ts。 */
import { polyFitModel } from "./poly-fit/model";
import type { ExperimentModel } from "./types";

export const experimentModels: Record<string, ExperimentModel> = {
  [polyFitModel.id]: polyFitModel,
};

/** SPEC §9 里规划了、但还没实现的实验。planned 的 KU 可以引用它们。 */
export const plannedExperiments = new Set(["line-fit", "descent-1d"]);
