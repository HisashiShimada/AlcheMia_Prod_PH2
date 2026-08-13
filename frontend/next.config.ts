import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // /api/v1/* をバックエンド（ポート3001）にプロキシ
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3001/api/v1/:path*',
      },
    ];
  },

  // Turbopack 設定（Next.js 16 以降はデフォルトで Turbopack が有効）
  // webpack 設定が存在する場合、turbopack 設定も必須（空でも可）
  turbopack: {},

  // Webpack フォールバック用（dev:webpack コマンド時のみ適用）
  // Turbopack 使用時（next dev --turbo / next build）はこのセクションは無視される
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  webpack: (config: any) => {
    // SVGをReactコンポーネントとしてインポート可能にする
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
};

export default nextConfig;
