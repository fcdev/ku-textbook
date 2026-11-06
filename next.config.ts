import type { NextConfig } from "next";

// 国内部署：不引用任何 Google 服务；字体走系统字体栈（见 docs/DECISIONS.md）
// STATIC_EXPORT=1 时导出纯静态站点（GitHub Pages 等），BASE_PATH 为子路径，如 /ku
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 需要服务端的文件（API）命名为 *.server.ts，静态导出时不参与构建
  pageExtensions: isExport ? ["tsx", "ts"] : ["tsx", "ts", "server.ts"],
  serverExternalPackages: ["@electric-sql/pglite", "@node-rs/argon2"],
  env: { NEXT_PUBLIC_DEMO: isExport ? "1" : (process.env.NEXT_PUBLIC_DEMO ?? "") },
  ...(isExport ? { output: "export", trailingSlash: true, basePath: process.env.BASE_PATH || undefined } : {}),
};

export default nextConfig;
