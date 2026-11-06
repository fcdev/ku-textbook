# KU 投稿指南

一个 KU（知识单元）= 一个核心概念 + 一个能拖动的实验 + 3 道以上即时反馈的题。投稿方式是给本仓库提 Pull Request，CI 会自动检查格式，审核人在预览里看效果。

## 1. 先占个位

在 `content/ku/<id>/index.mdx` 里只写 frontmatter，`status: planned`，它就会以“即将上线”出现在知识地图上：

```yaml
---
id: biasvar                # 小写字母、数字、短横线；必须等于目录名
title: 偏差与方差
prerequisites: [overfit]   # 前置 KU 的 id，不能成环
chapter: 8                 # 《Understanding Deep Learning》章节号，只用于延伸阅读
reading:
  - { title: "Understanding Deep Learning 第 8 章", url: "https://udlbook.github.io/udlbook/" }
status: planned
---
```

## 2. 写正文

把 `status` 改成 `draft`，补上 `summary`（≤ 40 字）、`estMinutes`、`experiment`、`links`（跨学科连接，教案生成会用），然后写正文。参考 `content/ku/overfit/`。

```mdx
<Intuition>

## 一个直白的小标题

先讲一个生活里的例子，两三句话。

<Experiment id="poly-fit" preset="article" />

<Stage label="1–2 阶">拖到这里会看到什么，说明什么。</Stage>

<Callout>一句话总结。</Callout>

</Intuition>

<Theory>

## 原理

<Formula>L(w) = \frac{1}{N}\sum_i (f(x_i) - y_i)^2</Formula>

行内公式用 $w$。

</Theory>
```

可用的组件：

| 组件 | 用途 |
| --- | --- |
| `<Intuition>` / `<Theory>` | 直觉层（必须有）/ 原理层 |
| `<Experiment id preset [sweep]>` | 嵌入实验。`sweep` 显示误差曲线 |
| `<Stage label>` | “拖到这里会看到什么”的小卡片 |
| `<Callout>` | 重点提示 |
| `<Formula>` | 独立公式（KaTeX，构建时渲染）。公式里不能有英文双引号 |
| `<Train>` / `<Test>` | 用训练 / 测试数据的颜色标出文字 |

写作要求：

- **先动手，后讲道理**：第一屏就要有能拖的实验。
- 受众最小是高中生：不用没解释过的术语，不用卡通化的语气。
- 一个 KU 只讲一个概念。讲不完的拆成两个 KU，用前置关系连起来。
- **不要照抄任何书的文字、图或代码**。《Understanding Deep Learning》是 CC BY-NC-ND 许可，只能当大纲参考和延伸阅读链接。

## 3. 出题

`content/ku/<id>/quiz.yaml`，至少 3 道。两种题型：

```yaml
- id: q1
  type: experiment-target            # 把实验调到某个状态
  prompt: 拖动滑块，让曲线穿过所有蓝点。
  experiment: { id: poly-fit, preset: practice, hide: [testPoints] }
  check: { metric: trainMSE, op: "<", value: 0.002 }
  hint: 答错时显示，给方向，不给答案。
  explain: 答对时显示，解释为什么。
- id: q2
  type: choice
  prompt: 一个模型训练误差很低，测试误差却很高。它最可能是……
  options: [欠拟合, 过拟合, 拟合得刚刚好]
  answer: 1                          # 从 0 开始
  hint: …
  explain: …
```

`check.op` 支持 `<` `<=` `>` `>=` `between`（`value: [下限, 上限]`）`near-min` `near-max`（`over: 参数名`，`tolerance: { steps, ratio }`）。每个实验有哪些指标、参数和 preset，见 `src/experiments/<实验>/model.ts`。

`pnpm test` 会对每道实验题做网格搜索：默认状态不能直接答对，并且一定存在能答对的参数。题出错了会直接报出来。

## 4. 本地检查

```bash
pnpm install
pnpm ku:lint     # 格式、前置、成环、实验引用、summary 长度
pnpm test        # 包括“每道实验题都可解”
pnpm dev         # 打开 http://localhost:3000/ku/<id> 手机宽度下学一遍
```

## 5. 需要新实验？

实验是工程师写的 React 组件，放在 `src/experiments/<id>/`：`model.ts`（纯函数 `compute` / `sweep`，带 seed，可单测）+ 组件 + 在 `models.ts` 和 `registry.ts` 里注册。数据颜色全站固定：训练 = `--color-train`（实心点），测试 = `--color-test`（空心圈），模型 = `--color-model`（粗实线），真实规律 = `--color-truth`（虚线）。先在 Issue 里描述实验想让学生看到什么现象，再动手。

## 6. 提交

提 PR 时按模板里的审核清单逐项勾选。审核人会在 CI 生成的预览里看效果，通过后把 `status` 改成 `published` 合并。
