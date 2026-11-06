# 部署

站点有两种跑法：

| | 静态演示（GitHub Pages） | 完整版（服务器） |
| --- | --- | --- |
| 学生端（地图、文章、闯关、沙盒、学习路径） | ✓ | ✓ |
| 教师端 | 演示模式：数据存在浏览器里，教案用模板生成 | 账号、课程、教案存数据库；教案可用大模型生成 |
| 需要 | 无 | Node 22、PostgreSQL（可选）、大模型接口（可选） |

## 静态演示

推送到 `main` 后 `.github/workflows/pages.yml` 自动构建并发布到 `https://<用户名>.github.io/<仓库名>/`。仓库 Settings → Pages 的 Source 要选 GitHub Actions。

本地构建同样的静态站点：

```bash
STATIC_EXPORT=1 BASE_PATH=/ku-textbook pnpm build   # 产物在 out/
```

GitHub Pages 在中国大陆访问不稳定，只适合演示。

## 完整版

### 环境变量

见 `.env.example`。生产环境至少要设 `SESSION_SECRET`。

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | `postgres://…`。不设则用内嵌 PGlite（数据在 `.data/pglite`），适合单机小规模试点 |
| `SESSION_SECRET` | 会话签名密钥，≥ 32 字符，生产必填 |
| `SEED_INVITE` | 启动时确保存在这个邀请码（1000 次）。也可以用 `pnpm invite <码> <次数> <备注>` 手动建 |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | OpenAI 兼容的 Chat Completions 接口。不设则教案全部用模板生成 |

数据库迁移在服务第一次连接数据库时自动执行（`drizzle/` 目录）。改了 `src/db/schema.ts` 后运行 `pnpm exec drizzle-kit generate` 生成新的迁移并提交。

### 单机

```bash
pnpm install --frozen-lockfile
pnpm build
SESSION_SECRET=... DATABASE_URL=... pnpm start   # 默认 3000 端口
```

前面放 Nginx 做 HTTPS 反向代理。教案接口是流式响应，Nginx 里给 `/api/lesson-plan` 加 `proxy_buffering off;`。

### Docker

```bash
docker build -t ku .
docker run -p 3000:3000 --env-file .env ku
```

## 在中国大陆上线

这几件事不是写代码能解决的，但上线前必须做：

1. **服务器和域名**：用国内云（阿里云、腾讯云、华为云等）的轻量服务器或容器服务，数据库用同一家的云 PostgreSQL。域名要在同一家云完成 **ICP 备案**（一般 1–3 周），备案完成前不能用 80/443 端口对公众提供服务。
2. **大模型**：面向公众的生成式 AI 服务要用**已完成备案的大模型**（如通义千问、文心、DeepSeek、智谱、Kimi 等的官方 API，它们大多提供 OpenAI 兼容接口），把 `LLM_BASE_URL` 和 `LLM_MODEL` 指过去即可，代码不用改。按《生成式人工智能服务管理暂行办法》，自己的产品如果直接面向公众提供生成内容，还可能需要做算法备案或登记，上线前请咨询法务。教师端只对邀请注册的老师开放，风险较低。
3. **不依赖境外服务**：代码里没有引用 Google Fonts、Google Analytics 等服务。字体目前写在字体栈里，没装的设备回落到系统字体；要统一字形，把思源黑体 / 思源宋体子集化后放进 `public/fonts` 并在 `globals.css` 里加 `@font-face`。
4. **公安备案**：网站上线后 30 日内在全国互联网安全管理服务平台做公安联网备案。

## 检查清单

- [ ] `SESSION_SECRET` 已设置且没有提交到仓库
- [ ] 数据库每日备份
- [ ] `/api/lesson-plan` 反向代理关闭了缓冲
- [ ] 用一个邀请码走一遍“注册 → 组课 → 生成教案 → 导出 → 投屏”
- [ ] `pnpm e2e` 在预发环境通过
