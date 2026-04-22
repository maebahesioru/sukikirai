import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { WebsiteStructuredData } from "@/components/StructuredData";
import ClientLayout from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap', // フォント読み込み最適化
  preload: true,
  fallback: ['system-ui', 'arial'], // フォールバック追加
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: "ヒカマーズ好き嫌い.com - ヒカマー界隈の好き嫌い投票サイト",
    template: "%s | ヒカマーズ好き嫌い.com"
  },
  description: "ヒカマー界隈のあの人のこと好き？嫌い？みんなの意見を見てコメントしよう！",
  keywords: ["ヒカマー", "好き嫌い", "投票", "ランキング"],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    title: "ヒカマーズ好き嫌い.com - ヒカマー界隈の好き嫌い投票サイト",
    description: "ヒカマー界隈のあの人のこと好き？嫌い？みんなの意見を見てコメントしよう！",
    siteName: "ヒカマーズ好き嫌い.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "ヒカマーズ好き嫌い.com",
    description: "ヒカマー界隈のあの人のこと好き？嫌い？",
    creator: "@hikamers",
    site: "@hikamers",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Google Search Console
    // google: 'your-google-verification-code',
    // Bing Webmaster Tools
    // other: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <WebsiteStructuredData />
        {/* DNS Prefetch & Preconnect for Supabase */}
        <link rel="dns-prefetch" href="https://hppzdwxlldhmxjbtcepx.supabase.co" />
        <link rel="preconnect" href="https://hppzdwxlldhmxjbtcepx.supabase.co" crossOrigin="anonymous" />
      </head>
      <body
        className={`${geistSans.variable} antialiased`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
              <script src="https://hikakinmaniacoin.hikamer.f5.si/ad.js" async></script>
      </body>
    </html>
  );
}
