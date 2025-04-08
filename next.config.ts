import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "coverartarchive.org",
      },
    ],
  },
};

export default nextConfig;