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

## 目前做到哪（第 1 周）

- 22 个 KU 全部上地图，`overfit`（过拟合与欠拟合）是完整的：互动文章（直觉 / 原理）、4 道闯关题、实验沙盒。
- 页面：`/` 知识地图 + 搜索 + 学习路径，`/ku/overfit`，`/ku/overfit/practice`，`/ku/overfit/lab`。
- 学生进度存在 localStorage，读写失败时静默降级。
- 还没做：教师端、数据库、教案生成、其余 5 个完整 KU 和两个实验（见 SPEC §10 第 2–3 周）。

## 写一个 KU

在 `content/ku/<id>/` 下放 `index.mdx`（frontmatter + `<Intuition>` / `<Theory>`）和 `quiz.yaml`，格式见 SPEC §5.1、§5.2，参考 `content/ku/overfit/`。只写 frontmatter、`status: planned` 就能先上地图。提交前跑 `pnpm ku:lint`。
