import type { NextConfig } from "next";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const normalizedBasePath = rawBasePath === "/" ? "" : rawBasePath.replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@slobbe/sudoku-board"],
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  ...(normalizedBasePath
    ? {
      basePath: normalizedBasePath,
      assetPrefix: `${normalizedBasePath}/`,
    }
    : {}),
};

export default nextConfig;
