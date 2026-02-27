import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // パッケージインポートの最適化
  // 大きなライブラリのツリーシェイキングとバンドルサイズ削減
  experimental: {
    optimizePackageImports: [
      'antd',
      '@ant-design/icons',
      '@mui/material',
      '@mui/icons-material',
      'lucide-react',
      '@emotion/react',
      '@emotion/styled',
      'reactflow',
    ],
  },

  // Reactのストリクトモードを有効化（開発時のパフォーマンス改善）
  reactStrictMode: true,

  // Turbopack設定（Next.js 16以降のデフォルトバンドラー）
  // SVGをReactコンポーネントとしてインポート可能にする
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Webpackの最適化設定（--webpack フラグ使用時のフォールバック）
  webpack: (config, { dev, isServer }) => {
    // 開発モードでのキャッシュ最適化
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }

    // SVGをReactコンポーネントとしてインポート可能にする
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

};

export default nextConfig;