import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Business logo uploads are capped at 2MB (see settings/actions.ts);
      // this must be >= that, with headroom for multipart overhead.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
