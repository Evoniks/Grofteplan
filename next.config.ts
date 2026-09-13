import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Mindre korrupte .next-chunks på OneDrive (Cannot find module './611.js').
      config.cache = false;
    }
    return config;
  }
};

export default nextConfig;
