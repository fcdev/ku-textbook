/** 客户端实验注册表：model + Component。组件按需加载，每个 KU 页只下载自己用到的实验。 */
import dynamic from "next/dynamic";
import type { ExperimentDef, ExperimentProps } from "./types";
import { experimentModels } from "./models";

const lazy = (load: () => Promise<{ default: React.ComponentType<ExperimentProps> }>) => dynamic(load);

export const experiments: Record<string, ExperimentDef> = {
  "poly-fit": { ...experimentModels["poly-fit"], Component: lazy(() => import("./poly-fit/PolyFit")) },
  "line-fit": { ...experimentModels["line-fit"], Component: lazy(() => import("./line-fit/LineFit")) },
  "descent-1d": { ...experimentModels["descent-1d"], Component: lazy(() => import("./descent-1d/Descent1D")) },
  "descent-2d": { ...experimentModels["descent-2d"], Component: lazy(() => import("./descent-2d/Descent2D")) },
  "tiny-net": { ...experimentModels["tiny-net"], Component: lazy(() => import("./tiny-net/TinyNet")) },
};
