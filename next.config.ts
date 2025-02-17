import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ['picsum.photos', 'cdn.leonardo.ai', 'media0.giphy.com'],
  },
  env: {
    LEONARDO_API_KEY: process.env.LEONARDO_API_KEY,
  },
};

export default nextConfig;
