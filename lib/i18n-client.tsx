"use client";

// i18n クライアント用（Provider + フック）
import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, translate, type Locale, type TFunc } from "./i18n-core";

const LocaleContext = createContext<{ locale: Locale; t: TFunc }>({
  locale: DEFAULT_LOCALE,
  t: (k, p) => translate(DEFAULT_LOCALE, k, p),
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t: TFunc = (k, p) => translate(locale, k, p);
  return <LocaleContext.Provider value={{ locale, t }}>{children}</LocaleContext.Provider>;
}

/** クライアントコンポーネント用: `const t = useT();` して `t("日本語キー")` */
export function useT(): TFunc {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}
