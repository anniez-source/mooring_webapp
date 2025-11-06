import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here - deployed to Vercel */
  turbopack: {}, // Silence Next.js 16 warning
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/node_modules', '**/.next', '**/.git']
    };
    return config;
  },
  // Enable standalone output for Docker
  output: 'standalone',
  // Disable eslint during builds for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
