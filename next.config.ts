import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "coverartarchive.org",
      },
    ],
  },
  // async rewrites() {
  //   return [
  //     // Handle /api/metrics locally (no rewrite)
  //     {
  //       source: '/api/metrics',
  //       destination: '/api/metrics', // Keep it local to Next.js
  //     },
  //     // Proxy all other /api/* requests to Python backend
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:8000/api/:path*',
  //     },
  //   ];
  // },
};

export default nextConfig;