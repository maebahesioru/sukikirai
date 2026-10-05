"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, Check } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n-client";
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, stripLocalePrefix, type Locale } from "@/lib/i18n-core";

const SHORT: Record<Locale, string> = {
  ja: "JA",
  en: "EN",
  "zh-Hans": "简",
  "zh-Hant": "繁",
  ko: "KO",
  es: "ES",
  fr: "FR",
};

/** 言語切替（7言語ドロップダウン）。cookie保存 + ロケール付きURLへ遷移 */
export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const switchTo = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = next;
    const { rest } = stripLocalePrefix(pathname);
    const target = next === "ja" ? rest : `/${next}${rest === "/" ? "" : rest}`;
    setOpen(false);
    router.push(target);
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        title="Language"
        aria-label="Language"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-mut hover:text-txt hover:bg-panel2 transition text-sm font-medium"
      >
        <Globe className="w-4 h-4" />
        {SHORT[locale]}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-panel border border-line rounded-xl shadow-xl py-1 w-44">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => switchTo(l)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition hover:bg-panel2 ${
                l === locale ? "text-x font-bold" : "text-txt"
              }`}
            >
              {LOCALE_LABELS[l]}
              {l === locale && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
