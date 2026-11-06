import { defaultParams, type ExperimentModel, type Params } from "../types";
import { DATASETS, makeDataset, TinyNet, type Act } from "./net";

export const NET_LRS = [0.003, 0.01, 0.03, 0.1, 0.3];
export const N_POINTS = 160;
export const TEST_OFFSET = 1000;

export function hiddenOf(params: Params): number[] {
  return Array.from({ length: Number(params.layers) }, () => Number(params.width));
}
export const actOf = (params: Params): Act => (Number(params.act) === 1 ? "tanh" : "relu");

/** 按参数训练 epochs 轮（判分和单测用；页面里是边训练边画）。 */
export function trainFor(params: Params, seed: number) {
  const train = makeDataset(Number(params.dataset), N_POINTS, Number(params.noise), seed);
  const test = makeDataset(Number(params.dataset), N_POINTS, Number(params.noise), seed + TEST_OFFSET);
  const net = new TinyNet(hiddenOf(params), actOf(params), seed);
  for (let e = 0; e < Number(params.epochs); e++) net.trainEpoch(train, Number(params.lr));
  return { net, train, test, metrics: { loss: net.loss(train), trainAcc: net.accuracy(train), testAcc: net.accuracy(test), paramCount: net.paramCount } };
}

export const tinyNetModel: ExperimentModel = {
  id: "tiny-net",
  params: [
    { key: "dataset", label: "数据", kind: "enum", options: DATASETS.map((d, i) => ({ value: i, label: d })), default: 1 },
    { key: "layers", label: "隐藏层数", kind: "int", min: 1, max: 3, step: 1, default: 1 },
    { key: "width", label: "每层神经元", kind: "int", min: 1, max: 8, step: 1, default: 3 },
    { key: "act", label: "激活函数", kind: "enum", options: [{ value: 0, label: "ReLU" }, { value: 1, label: "tanh" }], default: 0 },
    { key: "lr", label: "学习率", kind: "enum", options: NET_LRS.map((v) => ({ value: v, label: String(v) })), default: 0.03 },
    { key: "noise", label: "噪声", kind: "float", min: 0, max: 0.3, step: 0.01, default: 0.05 },
    { key: "epochs", label: "训练轮数", kind: "int", min: 0, max: 1000, step: 50, default: 300 },
  ],
  metrics: [
    { key: "loss", label: "训练损失", format: "error" },
    { key: "trainAcc", label: "训练准确率", format: "percent" },
    { key: "testAcc", label: "测试准确率", format: "percent" },
    { key: "paramCount", label: "参数个数", format: "number" },
  ],
  presets: {
    article: { params: { dataset: 1, layers: 1, width: 3 }, visibleControls: ["width"], seed: 3 },
    lab: { params: { dataset: 1, layers: 1, width: 3 }, seed: 3 },
  },
  compute(params, seed) {
    return trainFor({ ...defaultParams(tinyNetModel), ...params }, seed).metrics;
  },
};
