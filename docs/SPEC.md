# KU 互动教材 · 开发规格（给 Claude Code）

> 版本 v0.1 · 2026-11-05 · 作者 C
> 用法：把本文件放进新仓库的 `docs/SPEC.md`，把 `ku-demo.html` 放进 `docs/reference/`，然后把文末“第一条指令”发给 Claude Code。
> 产品背景和取舍见会议版产品方案；交互参考见 `docs/reference/ku-demo.html`（同一个“过拟合”KU 的五种学法样机）。

---

## 1. 要做什么

一个 AI 通识教材网站。最小内容单位是 **KU（Knowledge Unit，知识单元）**：一个核心概念 + 一个浏览器内运行的交互实验 + 3–5 道即时反馈的题。KU 之间有“前置”关系，构成一张有向无环图（DAG）；学习路径和课程都从这张图上自动算出来。

两个入口，共用同一套 KU：

- **学生 / 自学者（免登录）**：知识地图、互动文章、闯关练习、实验沙盒、学习路径。
- **老师（邀请码登录）**：选 KU 组课（自动补齐前置）、一键生成教案、课堂投屏。

## 2. 第一个月的范围

**做：**

1. 知识地图 + 搜索 + 学习路径：22 个 KU 全部上图（清单见 §9），未完成的标“即将上线”。
2. 6 个完整 KU：`linreg` 一元线性回归、`loss` 损失函数、`gd` 梯度下降、`lr` 学习率、`overfit` 过拟合与欠拟合、`l2` L2 正则化。每个都有直觉层、实验、3 道以上闯关题；原理层至少 3 个。
3. 每个完整 KU 三种视图：互动文章、闯关、沙盒（同一个实验组件）。
4. 教师端：邀请码注册登录、组课、教案生成（大模型）与编辑、导出 Markdown、投屏模式。
5. 内容流水线：KU 以 MDX + YAML 存在仓库里，通过 PR 投稿；CI 校验 schema、前置是否存在、是否成环。
6. 手机优先，桌面可用。

**不做：** 学生账号、班级管理、学情数据、私有化部署、在线投稿编辑器、中小学版、真实 GPU 算力、多语言（但文案要集中管理，留好 i18n 的口子）。

## 3. 技术选型

| 层 | 选择 | 理由 |
| --- | --- | --- |
| 框架 | Next.js（App Router）+ TypeScript（strict） | KU 页可静态生成，教师端需要服务端 |
| 样式 | Tailwind CSS + CSS 变量做主题 token | 设计 token 由 Claude Design 产出后直接落到变量 |
| 内容 | MDX（正文）+ YAML（题目）+ Zod（schema） | 作者用 Markdown 写，工程师写组件 |
| 实验 | React 客户端组件，SVG 绘图，纯 TS 数值计算 | 不依赖后端算力；第一个月不用 Pyodide |
| 搜索 | 构建期生成索引，客户端 FlexSearch（或同类） | 22–200 个 KU 不需要搜索服务 |
| 数据库 | PostgreSQL + Drizzle ORM | 只存老师、课程、教案 |
| 认证 | 邀请码 + 手机号/邮箱 + 密码，httpOnly session cookie，密码 argon2 | 第一个月只有老师登录 |
| 大模型 | OpenAI 兼容的 Chat Completions 接口，`LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` 三个环境变量 | 国内上线要用已备案的国产模型，接口做成可替换 |
| 测试 | Vitest（lib 层）+ Playwright（关键流程） | |
| 包管理 | pnpm | |

**国内部署约束（写代码时就要遵守）：**

- 不引用 Google Fonts、Google Analytics 或其他在大陆被墙的服务。字体自托管（思源黑体 / 思源宋体子集化，或系统字体栈）。
- 面向公众上线需要 ICP 备案；生成式 AI 功能要用已备案的模型服务。这两件事不是工程任务，但部署方案要按“国内云 + 备案域名”来设计。

## 4. 目录结构

```
content/
  ku/
    overfit/
      index.mdx        # frontmatter + <Intuition> + <Theory>
      quiz.yaml        # 闯关题
    l2/ ...
src/
  app/
    page.tsx                     # 知识地图 + 搜索
    ku/[id]/page.tsx             # 互动文章（?level=theory 切原理层）
    ku/[id]/practice/page.tsx    # 闯关
    ku/[id]/lab/page.tsx         # 沙盒
    path/[id]/page.tsx           # 学习路径
    teacher/(auth)/login, register
    teacher/page.tsx             # 我的课程
    teacher/courses/[id]/page.tsx        # 组课
    teacher/courses/[id]/plan/page.tsx   # 教案编辑与导出
    present/[courseId]/page.tsx          # 投屏模式
    api/lesson-plan/route.ts             # 调大模型
  experiments/
    registry.ts          # 所有实验的 ExperimentDef
    poly-fit/            # overfit、l2 共用
    line-fit/            # linreg、loss
    descent-1d/          # gd、lr
    primitives/          # <Plot> <Axis> <Points> <Curve> <Slider> <Readout>
  lib/
    content.ts           # 读取、校验 KU
    graph.ts             # DAG：closure、topoSort、layers、assertAcyclic
    quiz.ts              # 判分
    numeric.ts           # 最小二乘、多项式求值、MSE 等
    llm.ts               # OpenAI 兼容客户端
    progress.ts          # 学生进度（localStorage，失败时静默降级）
  db/ schema.ts
prompts/
  lesson-plan.md         # 教案 prompt 模板（带版本号）
scripts/
  ku-lint.ts             # CI 用
docs/
  SPEC.md  DESIGN.md  reference/ku-demo.html
```

## 5. 数据结构

### 5.1 KU frontmatter（`index.mdx`）

```yaml
---
id: overfit                  # 小写、短横线，全局唯一，等于目录名
title: 过拟合与欠拟合
summary: 模型把训练数据背下来，换成新数据就不行。   # ≤ 40 字
prerequisites: [lsq, split]  # 其他 KU 的 id
experiment: poly-fit         # registry 里的实验 id；planned 状态可省略
links:                       # 跨学科连接，教案生成会用
  math: [多项式函数, 待定系数法]
  physics: [实验数据处理]
reading:                     # 延伸阅读，只放链接和章节号，不放原文
  - { title: "Understanding Deep Learning 第 8 章", url: "https://udlbook.github.io/udlbook/" }
status: published            # planned | draft | review | published
authors: [zhangsan]
reviewers: [lisi]
estMinutes: 8
---
```

正文用两个容器组件：

```mdx
<Intuition>
一个学生把练习册的答案全背了下来……

<Experiment id="poly-fit" preset="article" />

<Stage label="1–2 阶">曲线太直，连蓝点都对不上。这是**欠拟合**。</Stage>
</Intuition>

<Theory>
<Formula>L(w) = \frac{1}{N}\sum_i (f(x_i) - y_i)^2</Formula>
……
</Theory>
```

`<Formula>` 用 KaTeX 在构建期渲染成 HTML，客户端不加载 KaTeX JS。

### 5.2 闯关题（`quiz.yaml`）

```yaml
- id: q1
  type: experiment-target          # 把实验调到某个状态
  prompt: 拖动滑块，让曲线穿过所有蓝点。
  experiment: { id: poly-fit, preset: practice, hide: [testPoints] }
  check: { metric: trainMSE, op: "<", value: 0.002 }
  hint: 阶数越高，曲线能拐的弯越多。
  explain: 训练误差几乎是 0。但看看橙圈，它们离曲线有多远？
- id: q2
  type: experiment-target
  prompt: 把阶数调到测试误差最小的位置。
  experiment: { id: poly-fit, preset: practice }
  check: { metric: testMSE, op: "near-min", over: degree, tolerance: { steps: 1, ratio: 1.6 } }
- id: q3
  type: choice
  prompt: 一个模型训练误差很低，测试误差却很高。它最可能是……
  options: [欠拟合, 过拟合, 拟合得刚刚好]
  answer: 1
  hint: 训练时表现好、考试时表现差，像哪种学生？
  explain: 它把训练数据背下来了，换成新数据就不行。
```

`op` 支持 `<` `<=` `>` `>=` `between` `near-min` `near-max`。`near-min` 需要实验提供 `sweep(paramName)`，返回该参数每个取值下的指标。

### 5.3 实验组件契约

```ts
export type ParamSpec =
  | { key: string; label: string; kind: "int" | "float"; min: number; max: number; step: number; default: number }
  | { key: string; label: string; kind: "enum"; options: { value: number; label: string }[]; default: number }
  | { key: string; label: string; kind: "bool"; default: boolean };

export interface MetricSpec { key: string; label: string; format: "error" | "percent" | "number" }

export interface ExperimentState {
  params: Record<string, number | boolean>;
  metrics: Record<string, number>;
}

export interface ExperimentDef {
  id: string;
  params: ParamSpec[];
  metrics: MetricSpec[];
  presets: Record<"article" | "practice" | "lab" | string, {
    params?: Partial<Record<string, number | boolean>>;
    visibleControls?: string[];   // 沙盒全放开，文章只放一个滑块
    seed?: number;
  }>;
  compute(params: ExperimentState["params"], seed: number): ExperimentState["metrics"];  // 纯函数，可单测
  sweep?(params: ExperimentState["params"], key: string, seed: number): { value: number; metrics: ExperimentState["metrics"] }[];
  Component: React.ComponentType<{
    preset: string;
    hide?: string[];
    onState?: (s: ExperimentState) => void;   // 闯关用它判分
    readOnly?: boolean;                        // 答题后锁定
  }>;
}
```

要求：

- `compute` 是纯函数，同样的参数和 seed 一定得到同样的结果。随机数用带 seed 的 PRNG（如 mulberry32），数据集在 seed 不变时固定，闯关题的标准答案才稳定。
- 拖动滑块时每帧重算并重绘，单次计算 < 8 ms（中端安卓机）。
- 颜色语义全站固定：训练数据 = `--color-train`，测试数据 = `--color-test`，模型 = `--color-model`，真实规律 = `--color-truth`（虚线）。
- `poly-fit` 的实现参考 `docs/reference/ku-demo.html` 里的 `fit()`：正规方程 + 岭项 + 部分主元高斯消元，x 归一化到 [-1, 1]，阶数 0–12。

### 5.4 数据库（Drizzle）

```
teachers      id, name, school, phone?, email?, password_hash, invite_code_id, created_at
invite_codes  id, code, note, max_uses, used, expires_at
courses       id, teacher_id, title, ku_ids text[], learned_ku_ids text[], stage ('高中'|'本科'),
              periods int, subject ('数学'|'物理'|'无'), created_at, updated_at
lesson_plans  id, course_id, content_md, model, prompt_version, created_at, edited_at
```

学生进度只存 localStorage：`{ [kuId]: { done: boolean, xp: number, lastQuiz: string } }`。所有读写包在 try/catch 里，失败就当没有进度。

## 6. 关键逻辑

### 6.1 图（`lib/graph.ts`）

- `buildGraph(kus)`：检查 id 唯一、前置都存在。
- `assertAcyclic(graph)`：有环时抛错并给出环上的 id 列表。CI 和构建都调用。
- `closure(ids)`：给定目标集合，返回它们和全部前置。
- `topoSort(ids)`：稳定排序，先按层（最长前置链长度），同层按 `title` 拼音或 frontmatter 顺序。
- `layers(graph)`：知识地图布局用。同层按父节点平均行号排序，减少交叉。

学习路径 = `topoSort(closure([target]))` 去掉已完成的。
组课 = `topoSort(closure(selected))`，不在 `selected` 里的标“自动补充前置”，老师可标“已学”排除。

### 6.2 判分（`lib/quiz.ts`）

- `choice`：比较下标。
- `experiment-target`：从 `onState` 拿到当前 metrics，按 `check` 判。`near-min`：调用 `sweep` 找最小值所在取值，当前取值与之相差 ≤ `tolerance.steps` 且当前指标 ≤ 最小值 × `tolerance.ratio` 即为正确。
- 判分在 50 ms 内给结果；答对 +10 XP；答错显示 `hint`，可重试，不扣分。

### 6.3 教案生成（`api/lesson-plan`）

- 输入：课程里未标“已学”的 KU（frontmatter + 直觉层纯文本 + 题目）、学段、课时、融合学科。
- Prompt 模板在 `prompts/lesson-plan.md`，带 `version`，存进 `lesson_plans.prompt_version`。
- 输出 Markdown，固定小节：教学目标 / 课前准备 / 课堂流程（每段带分钟数，总和 = 45 × 课时）/ 和××课的连接 / 随堂练习（引用 KU 的题目 id）/ 课后作业。服务端校验小节齐全、分钟数之和正确，不对就重试一次，再不对就用模板生成器兜底（逻辑同样机的 `teachRender()`）。
- 流式返回给前端；老师可在页面上直接改，保存后记录 `edited_at`。导出 Markdown。

## 7. 内容流水线

- `pnpm ku:lint`：Zod 校验 frontmatter 和 quiz；id 等于目录名；前置存在；无环；`experiment` 在 registry 里；题目里引用的 metric 和 param 在该实验里存在；`summary` ≤ 40 字。
- CI 在每个 PR 上跑 `ku:lint`、类型检查、单测，并部署预览环境，审核人在预览里看效果。
- `.github/pull_request_template.md` 放审核清单：一个核心概念；实验能在手机上操作；≥ 3 道题；前置正确；**没有照抄任何书的文字、图或代码**；延伸阅读只放链接。
- `status: planned` 的 KU 只需要 frontmatter，用来先把地图画完整。

## 8. 质量要求

- 手机优先：390 px 宽度下所有页面可用，滑块拇指可操作（触控目标 ≥ 44 px）。
- 性能：KU 页首屏 JS（gzip）< 200 KB；Lighthouse 移动端性能 ≥ 85。
- 可访问性：键盘可操作滑块和题目；实验图有文字版读数；尊重 `prefers-reduced-motion`；亮色和暗色两套主题。
- 测试：`graph`、`quiz`、`numeric`、每个实验的 `compute` 都有单测；Playwright 覆盖“地图 → 选目标 → 学习路径”、“闯关三题答完”、“老师注册 → 组课 → 生成教案 → 导出”。

## 9. 第一批 22 个 KU

“完整”= 第一个月做完；其余先 `planned` 上地图。章节号是《Understanding Deep Learning》的章节，只用于延伸阅读。

| id | 标题 | 前置 | 章 | 实验 | 第一个月 |
| --- | --- | --- | --- | --- | --- |
| supervised | 什么是监督学习 | – | 2 | – | planned |
| linreg | 一元线性回归 | supervised | 2 | line-fit | 完整 |
| split | 训练集与测试集 | supervised | 8 | – | planned |
| loss | 损失函数 | linreg | 2 | line-fit | 完整 |
| relu | 激活函数 ReLU | linreg | 3 | – | planned |
| lsq | 最小二乘与均方误差 | loss | 5 | line-fit | planned |
| gd | 梯度下降 | loss | 6 | descent-1d | 完整 |
| xent | 分类与交叉熵 | loss | 5 | – | planned |
| shallow | 浅层神经网络 | relu | 3 | – | planned |
| overfit | 过拟合与欠拟合 | lsq, split | 8 | poly-fit | 完整 |
| lr | 学习率 | gd | 6 | descent-1d | 完整 |
| sgd | 随机梯度下降 | gd | 6 | – | planned |
| uat | 万能逼近定理 | shallow | 3 | – | planned |
| deep | 深层网络 | shallow | 4 | – | planned |
| biasvar | 偏差与方差 | overfit | 8 | – | planned |
| l2 | L2 正则化 | overfit | 9 | poly-fit | 完整 |
| early | 提前停止 | overfit, gd | 9 | – | planned |
| adam | 动量与 Adam | sgd | 6 | – | planned |
| backprop | 反向传播 | gd, deep | 7 | – | planned |
| init | 参数初始化 | backprop | 7 | – | planned |
| ddescent | 双下降 | biasvar, deep | 8 | – | planned |
| dropout | Dropout | l2, deep | 9 | – | planned |

三个实验覆盖六个完整 KU：

- `line-fit`：拖动直线的斜率和截距，实时显示每个点的残差和 MSE；“自动拟合”按钮给出最小二乘解。
- `descent-1d`：一维损失曲线上的小球，按学习率一步步下降；可单步、自动播放；学习率过大时来回震荡甚至发散。
- `poly-fit`：多项式拟合，参数为阶数、训练点数、噪声、λ；指标为 trainMSE、testMSE；提供 `sweep("degree")`。

## 10. 里程碑（4 周）

| 周 | 交付 | 验收 |
| --- | --- | --- |
| 1 | 仓库脚手架、内容 schema 与 `ku:lint`、`graph.ts`、知识地图页、`poly-fit` 实验、`overfit` 的文章 / 闯关 / 沙盒三视图、预览环境 | 手机上能完整学完“过拟合”并答完题 |
| 2 | `line-fit`、`descent-1d`；其余 5 个完整 KU 接入（作者交稿的先接）；搜索；学习路径页；主题 token 落地 | 6 个 KU 三视图可用；`ku:lint` 在 CI 上跑 |
| 3 | 教师注册登录、组课、教案生成与编辑、导出、投屏模式 | 一位没有 AI 背景的老师能在 10 分钟内做出一节课的教案 |
| 4 | 内容联调、性能和可访问性、Playwright 用例、部署文档、投稿指南 | 销售可以拿它去学校演示；§8 的指标达标 |

## 11. 给 Claude Code 的第一条指令

```
读 docs/SPEC.md 和 docs/reference/ku-demo.html。先做第 1 周：
1. 按 §3、§4 搭 Next.js + TypeScript + Tailwind + pnpm 项目，不要引用任何 Google 的服务。
2. 实现 §5.1、§5.2 的 Zod schema 和 scripts/ku-lint.ts，并按 §9 建好 22 个 KU 的 frontmatter（只有 overfit 写正文和 quiz，正文可以先用样机里的文案）。
3. 实现 lib/graph.ts 和单测。
4. 实现 poly-fit 实验（§5.3），数值部分参考样机的 fit()，带单测。
5. 做知识地图首页、/ku/overfit、/ku/overfit/practice、/ku/overfit/lab 四个页面，交互对照样机。
每做完一步跑类型检查和单测。遇到规格没写清楚的地方，按最简单的做法实现，并在 docs/DECISIONS.md 里记一行。
```
