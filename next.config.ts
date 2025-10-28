import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {}, // Silence Next.js 16 warning
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/node_modules', '**/.next', '**/.git']
    };
    return config;
  },
};

export default nextConfig;
