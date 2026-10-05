"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";
import { LOCALE_COOKIE } from "@/lib/i18n-core";

/** 言語切替（ja ⇄ en）。cookieに保存してサーバーコンポーネントを再描画 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const next = locale === "ja" ? "en" : "ja";
  const label = locale === "ja" ? "EN" : "日本語";

  const switchLocale = () => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    router.refresh();
  };

  return (
    <button
      onClick={switchLocale}
      title={locale === "ja" ? "Switch to English" : "日本語に切り替え"}
      aria-label={locale === "ja" ? "Switch to English" : "日本語に切り替え"}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-mut hover:text-txt hover:bg-panel2 transition text-sm font-medium"
    >
      <Globe className="w-4 h-4" />
      {label}
    </button>
  );
}
