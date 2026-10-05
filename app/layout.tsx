import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, SITE_DESC } from "@/lib/site";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { getLocale } from "@/lib/i18n-server";

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

/* サイト全体の構造化データ（WebSite + 検索アクション） */
const WEBSITE_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "ja",
  description: SITE_DESC,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={notoSansJP.variable} suppressHydrationWarning>
      <body className="antialiased">
        {/* 描画前にテーマを確定させる（ここを next/script にすると遅延実行で一瞬前のテーマが見える）。
            body先頭の同期スクリプト = パース時に即実行され、初回ペイント前に html へクラスが付く */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_INIT }}
        />
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: WEBSITE_JSONLD }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
