"use client";

// i18n クライアント用（Provider + フック）
import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, registerDict, translate, type Locale, type TFunc } from "./i18n-core";

const LocaleContext = createContext<{ locale: Locale; t: TFunc }>({
  locale: DEFAULT_LOCALE,
  t: (k, p) => translate(DEFAULT_LOCALE, k, p),
});

export function LocaleProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  /** 非jaロケールの辞書（サーバーからpropsで受ける・jaはnull） */
  dict?: Record<string, string> | null;
  children: React.ReactNode;
}) {
  // format.ts等の translate(locale, ...) から使えるよう同期登録（冪等）
  if (dict) registerDict(locale, dict);
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
