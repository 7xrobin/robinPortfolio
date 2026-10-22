import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  allowedDevOrigins: ["*.trycloudflare.com"],
  images: { unoptimized: true },
};

export default nextConfig;
