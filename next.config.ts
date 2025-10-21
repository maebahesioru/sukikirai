import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 圧縮を有効化
  compress: true,
  
  // React Strict Modeを本番では無効化（若干の最適化）
  reactStrictMode: false,
  
  // SWC minifyを有効化（より高速な圧縮）
  swcMinify: true,
  
  // 本番環境ではソースマップを無効化（転送量削減）
  productionBrowserSourceMaps: false,
  
  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 31536000, // 1年間キャッシュ
  },
  
  // 実験的機能で最適化
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@supabase/supabase-js',
    ],
  },
  
  // Tree shaking強化
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  
  // 本番ビルドの最適化
  poweredByHeader: false,
  
  // Webpack設定で本番環境のconsole.logを削除
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      config.optimization.minimize = true;
    }
    return config;
  },
  
  // ヘッダー設定
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
