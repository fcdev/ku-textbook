import type { NextConfig } from "next";

// 国内部署：不引用任何 Google 服务；字体走系统字体栈（见 docs/DECISIONS.md）
// STATIC_EXPORT=1 时导出纯静态站点（GitHub Pages 等），BASE_PATH 为子路径，如 /ku
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isExport ? { output: "export", trailingSlash: true, basePath: process.env.BASE_PATH || undefined } : {}),
};

export default nextConfig;
