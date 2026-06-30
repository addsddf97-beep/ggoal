import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@food-shorts/shared"],
  serverExternalPackages: ["ffmpeg-static"]
};

export default nextConfig;
