import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(apiDir, "../.."),
  outputFileTracingIncludes: {
    "/api/video": [
      "../../node_modules/ffmpeg-static/**/*",
      "./node_modules/ffmpeg-static/**/*"
    ]
  },
  transpilePackages: ["@food-shorts/shared"],
  serverExternalPackages: ["ffmpeg-static"]
};

export default nextConfig;
