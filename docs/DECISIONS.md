# 实现决策记录

规格没写清楚、或实现时做了取舍的地方，一行一条。

- 2026-11-05 · `ExperimentDef` 拆成纯数据的 `ExperimentModel`（`experiments/models.ts`，ku-lint 和判分用）和带 `Component` 的 `ExperimentDef`（`experiments/registry.ts`，只在客户端用），避免 Node 脚本加载 React 组件。
- 2026-11-05 · frontmatter 多了一个可选字段 `chapter`（UDL 章节号），用于“第 8 章”搜索和以后教师端按章节分组；只当元数据，不放原文。
- 2026-11-05 · 同层 KU 的默认顺序放在 `content/ku/order.yaml`（§9 表格顺序），没有用拼音排序。
- 2026-11-05 · `<Formula>` 在 MDX 编译前被改写成 `<Formula tex="..." />`，由服务端 KaTeX 渲染；因为 next-mdx-remote 默认禁止 MDX 里的 JS 表达式，公式里不能出现英文双引号（ku-lint 检查）。行内公式用 `$...$`（remark-math + rehype-katex，同样在服务端渲染）。
- 2026-11-05 · 直觉 / 原理两层都在服务端渲染好，客户端只切显示并同步 `?level=theory`，页面保持纯静态。
- 2026-11-05 · 桌面文章页用 CSS grid 把 `<Experiment>` 放到右栏并 sticky；手机上实验留在正文中间。
- 2026-11-05 · 题目 `experiment.hide` 可隐藏的图层由实验声明（poly-fit：`testPoints`、`truth`、`trainPoints`、`model`），ku-lint 校验。
- 2026-11-05 · 实验题的判分 seed 取 preset 的 seed；闯关里实验题不能重新采样，保证标准答案稳定。
- 2026-11-05 · 第 1 周搜索先用构建期生成的文本 + 客户端子串匹配（含“第 N 章”），FlexSearch 留到第 2 周（KU 数量上来再换）。依赖已装好。
- 2026-11-05 · 字体用系统字体栈（苹方 / 思源 / 雅黑），没有自托管字体文件；等 Design 定字体后再子集化思源黑体 / 宋体。
- 2026-11-05 · 主题色值暂用样机配色，集中在 `src/app/globals.css` 的 `@theme static` 和暗色覆盖里，Design 出 token 后整段替换。
- 2026-11-05 · 闯关全部答完才写入进度（done=true，xp 取历史最高）。
- 2026-11-05 · 知识地图：桌面是 SVG 分层图，手机改成按层的竖向按钮列表（DESIGN §5 允许）。
- 2026-11-05 · `lr`、`linreg` 等另外 5 个完整 KU 第 1 周仍是 `planned`；`line-fit`、`descent-1d` 记在 `plannedExperiments` 里，ku-lint 允许 planned KU 引用。
