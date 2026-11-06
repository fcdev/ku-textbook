import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 国内部署：不引用任何 Google 服务；字体走系统字体栈（见 docs/DECISIONS.md）
};

export default nextConfig;
