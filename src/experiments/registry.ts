/** 客户端实验注册表：model + Component。 */
import type { ExperimentDef } from "./types";
import { experimentModels } from "./models";
import PolyFit from "./poly-fit/PolyFit";

export const experiments: Record<string, ExperimentDef> = {
  "poly-fit": { ...experimentModels["poly-fit"], Component: PolyFit },
};
