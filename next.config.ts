import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,

  // Docker 実行に必要最小限のファイルだけを .next/standalone に吐く（イメージ縮小・コピー高速化）
  output: "standalone",

  // 本番最適化
  reactStrictMode: false,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,

  // pg（node-postgres）はバンドルせずネイティブrequireさせる
  serverExternalPackages: ["pg"],

  // ESLintはビルドを止めない（型チェックは維持）
  eslint: { ignoreDuringBuilds: true },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
  },

  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },

  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
