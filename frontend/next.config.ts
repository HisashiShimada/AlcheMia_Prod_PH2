import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // mockディレクトリの静的ファイルを配信
  async rewrites() {
    return [
      {
        source: '/mock/:path*',
        destination: '/api/mock/:path*',
      },
    ];
  },
};

export default nextConfig;
