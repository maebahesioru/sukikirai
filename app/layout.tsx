import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DESC } from "@/lib/site";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - ツイッタラーの好き嫌い・評価サイト`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: ["好き嫌い", "評価", "X", "ツイッタラー", "ランキング", "世論調査", "レビュー"],
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    title: `${SITE_NAME} - ツイッタラーの好き嫌い・評価サイト`,
    description: SITE_DESC,
    siteName: SITE_NAME,
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESC,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f16" },
  ],
};

/* 初回アクセス: 保存済み設定 > OS設定の順で判定し、描画前に html へクラス付与（FOUC防止）。
   保存設定が無い間は OS 設定変更にも追従する。 */
const THEME_INIT = `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");function ap(){var t=null;try{t=localStorage.getItem("theme")}catch(e){}var d=t==="dark"||(t!=="light"&&m.matches);var e=document.documentElement;e.classList.toggle("dark",d);e.classList.toggle("light",!d)}ap();m.addEventListener("change",function(){var t=null;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="dark"&&t!=="light")ap()})}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
        {children}
      </body>
    </html>
  );
}
