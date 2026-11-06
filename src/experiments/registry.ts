/** 客户端实验注册表：model + Component。 */
import type { ExperimentDef } from "./types";
import { experimentModels } from "./models";
import Descent1D from "./descent-1d/Descent1D";
import LineFit from "./line-fit/LineFit";
import PolyFit from "./poly-fit/PolyFit";

export const experiments: Record<string, ExperimentDef> = {
  "poly-fit": { ...experimentModels["poly-fit"], Component: PolyFit },
  "line-fit": { ...experimentModels["line-fit"], Component: LineFit },
  "descent-1d": { ...experimentModels["descent-1d"], Component: Descent1D },
};
