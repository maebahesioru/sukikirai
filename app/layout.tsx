import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebsiteStructuredData } from "@/components/StructuredData";
import ClientLayout from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: "ヒカマーズ好き嫌い.com - ヒカマー界隈の好き嫌い投票サイト",
    template: "%s | ヒカマーズ好き嫌い.com"
  },
  description: "ヒカマー界隈のあの人のこと好き？嫌い？みんなの意見を見てコメントしよう！好感度ランキング、不人気ランキング、トレンドランキングも公開中。",
  keywords: ["ヒカマー", "ヒカマーズ", "好き嫌い", "投票", "ランキング", "コメント", "配信者", "好感度"],
  authors: [{ name: "ヒカマーズ好き嫌い.com" }],
  creator: "ヒカマーズ好き嫌い.com",
  publisher: "ヒカマーズ好き嫌い.com",
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
