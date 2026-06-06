import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  assetPrefix: "/offer-catcher/",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
