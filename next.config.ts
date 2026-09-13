import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude music-metadata from bundling — it relies on Node.js APIs
  // that break under the App Router bundler.
  serverExternalPackages: ["music-metadata"],
  experimental: {
    // Allow audio uploads up to 26 MB (slightly above the 25 MB app limit
    // to account for multipart overhead).
    proxyClientMaxBodySize: "26mb",
    serverActions: {
      bodySizeLimit: "26mb",
    },
  },
};

export default nextConfig;
