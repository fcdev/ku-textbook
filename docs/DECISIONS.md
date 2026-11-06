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
- 2026-11-06 · 搜索没有用 FlexSearch：构建期生成索引（标题、摘要、跨学科标签、直觉层正文、章节），客户端按命中位置打分（`lib/search.ts`）。FlexSearch 对中文需要自定义分词，几百个 KU 以内子串匹配更准也更小；超过一千个再换。
- 2026-11-06 · 字体按设计稿用 Noto Sans SC / Noto Serif SC / JetBrains Mono，但只写在字体栈里、不从 Google 加载；没装的设备回落到苹方 / 雅黑。正式上线前把思源子集化后放进 `public/fonts`。
- 2026-11-06 · 主题 token 换成 Claude Design 画布的亮 / 暗 / 投屏三套（`src/app/globals.css`）。设计里 model 是黑线、主按钮是黑色（`primary`），学习路径用荧光笔黄（`accent`），链接和焦点环用蓝（`focus`）。
- 2026-11-05 · 闯关全部答完才写入进度（done=true，xp 取历史最高）。
- 2026-11-05 · 知识地图：桌面是 SVG 分层图，手机改成按层的竖向按钮列表（DESIGN §5 允许）。
- 2026-11-06 · 5 个完整 KU（linreg、loss、gd、lr、l2）的正文和题目由 Claude 起草，待作者审核；全部原创，没有用 UDL 的文字或图。
- 2026-11-06 · `descent-1d` 用纯二次损失 L(w) = (w − 1)²，临界学习率有解析解（0.5 一步到位、1 来回跳、> 1 发散），便于出题和写原理层。
- 2026-11-06 · `descent-1d` 的指标 `stepsTo` 按 60 步内的完整轨迹算，与当前已走步数无关，这样“选一个学习率”的题不用学生先点完播放。
- 2026-11-06 · `src/lib/content.test.ts` 对每道实验题做网格搜索：默认状态不能直接答对，可见滑块的取值里一定有解。作者改题后跑 `pnpm test` 就能发现出错的题。
- 2026-11-06 · 教师端路由用查询参数（`/teacher/course?id=…`、`/teacher/plan?id=…`、`/present?course=…`），没有用 SPEC 里的 `[id]` 动态段，这样同一套页面能静态导出到 GitHub Pages。
- 2026-11-06 · 需要服务端的接口文件命名为 `route.server.ts`，`next.config.ts` 里只有非静态导出时才把 `server.ts` 加进 `pageExtensions`。
- 2026-11-06 · 教师端数据接口有两套实现（`src/teacher/api-http.ts` / `api-demo.ts`），静态导出时用演示实现：数据存 localStorage，邀请码固定 `KU-DEMO`，教案用模板生成。
- 2026-11-06 · 会话不建表：cookie 里放 `teacherId.过期时间.HMAC`（SESSION_SECRET 签名），30 天有效。缺点是不能单独吊销某个会话，换 SESSION_SECRET 会让所有人重新登录。
- 2026-11-06 · 没设 `DATABASE_URL` 时用内嵌 PGlite，迁移在首次连接时自动执行。生产环境不会自动建邀请码，除非设置 `SEED_INVITE`。
- 2026-11-06 · 教案的模板生成器每个知识点只引用前 2 道题；课堂流程分钟数按“导入 5 + 各 KU 平均 + 随堂练习约 15% + 小结 5”分配，总和严格等于 45 × 课时。
- 2026-11-06 · 教案 prompt 在 `prompts/lesson-plan.md`，frontmatter 里的 `version` 写进 `lesson_plans.prompt_version`；模板生成的记为 `template`。
- 2026-11-06 · 教案预览用自己写的极简 Markdown 渲染（`lib/md.ts`，先转义 HTML），没有引入 Markdown 库。
- 2026-11-06 · 实验组件用 `next/dynamic` 按需加载，每个 KU 页只下载自己的实验。Lighthouse 移动端：`/ku/overfit` 性能 99、可访问性 100。
- 2026-11-06 · 测试数据点颜色 `--color-test` 用作文字时对比度不够 4.5:1，加了 `--color-test-text`（亮色 #B03F00）专门给文字用，图上的点仍用设计色。
