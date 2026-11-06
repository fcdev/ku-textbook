# KU 互动教材

在线演示：https://ku-textbook.fcdev.me/

AI 通识教材网站：每个知识单元（KU）= 一个核心概念 + 一个浏览器内的交互实验 + 几道即时反馈的题。规格见 [docs/SPEC.md](docs/SPEC.md)，实现取舍见 [docs/DECISIONS.md](docs/DECISIONS.md)。

## 跑起来

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

不用装数据库：没设 `DATABASE_URL` 时用内嵌的 PGlite。开发环境自动创建邀请码 `KU-DEMO`，可以直接在 `/teacher` 注册老师账号。没配大模型时，教案用模板生成。环境变量见 `.env.example`。

## 常用命令

| 命令 | 做什么 |
| --- | --- |
| `pnpm ku:lint` | 校验所有 KU 的 frontmatter、题目、前置、环、实验引用 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm test` | Vitest 单测（图、判分、数值、三个实验、ku-lint、教案、搜索；每道实验题都可解） |
| `pnpm build` | 先跑 ku:lint，再构建 |
| `pnpm e2e` | Playwright（先 `pnpm build`）：地图 → 学习路径、闯关、老师注册 → 组课 → 教案 → 导出 → 投屏、axe 可访问性 |
| `pnpm invite <码> [次数] [备注]` | 创建老师邀请码 |

## 做了什么

- **学生端**（免登录）：知识地图 + 搜索、学习路径、互动文章（直觉 / 原理两层）、闯关、实验沙盒。22 个 KU 上图，6 个完整：一元线性回归、损失函数、梯度下降、学习率、过拟合与欠拟合、L2 正则化。三个实验：`line-fit`、`descent-1d`、`poly-fit`。进度存 localStorage。
- **教师端**（邀请码注册）：我的课程、组课（自动补前置、可标已学）、教案生成（大模型流式输出，校验小节和分钟数，不合格重试一次，再不行用模板兜底）、编辑、导出 Markdown、投屏模式。
- **内容流水线**：KU 是 `content/ku/` 下的 MDX + YAML，PR 投稿，CI 跑 lint、类型检查、单测、构建和 e2e。

## 文档

- [docs/SPEC.md](docs/SPEC.md)：开发规格
- [docs/DECISIONS.md](docs/DECISIONS.md)：实现时的取舍
- [docs/DEPLOY.md](docs/DEPLOY.md)：部署（含国内备案注意事项）
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)：KU 投稿指南
