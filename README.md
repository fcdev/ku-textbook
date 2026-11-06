# KU 互动教材

在线演示：https://fcdev.github.io/ku-textbook/

AI 通识教材网站：每个知识单元（KU）= 一个核心概念 + 一个浏览器内的交互实验 + 几道即时反馈的题。规格见 [docs/SPEC.md](docs/SPEC.md)，实现取舍见 [docs/DECISIONS.md](docs/DECISIONS.md)。

## 跑起来

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

## 常用命令

| 命令 | 做什么 |
| --- | --- |
| `pnpm ku:lint` | 校验所有 KU 的 frontmatter、题目、前置、环、实验引用 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest 单测（graph / quiz / numeric / poly-fit / ku-lint） |
| `pnpm build` | 先跑 ku:lint，再静态生成全部页面 |

## 目前做到哪

- 22 个 KU 全部上地图，6 个完整：一元线性回归、损失函数、梯度下降、学习率、过拟合与欠拟合、L2 正则化。每个都有互动文章（直觉 / 原理）、闯关和实验沙盒。
- 三个实验：`line-fit`、`descent-1d`、`poly-fit`。
- 页面：`/` 知识地图 + 搜索，`/ku/<id>`、`/ku/<id>/practice`、`/ku/<id>/lab`，`/path/<id>` 学习路径。
- 学生进度存在 localStorage，读写失败时静默降级。

## 写一个 KU

在 `content/ku/<id>/` 下放 `index.mdx`（frontmatter + `<Intuition>` / `<Theory>`）和 `quiz.yaml`，格式见 SPEC §5.1、§5.2，参考 `content/ku/overfit/`。只写 frontmatter、`status: planned` 就能先上地图。提交前跑 `pnpm ku:lint`。
