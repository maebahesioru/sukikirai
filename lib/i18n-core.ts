// i18nコア（サーバー・クライアント共用・"use client"を付けないこと）
// 方針: gettext式 — 日本語文字列そのものをキーにする。未訳はjaのままフォールバック。
import en from "./i18n/messages/en.json";
// TEMP: 5言語の辞書到着後に有効化（i18n-core 復元コミット参照）
// import zhHans from "./i18n/messages/zh-Hans.json";
// import zhHant from "./i18n/messages/zh-Hant.json";
// import ko from "./i18n/messages/ko.json";
// import es from "./i18n/messages/es.json";
// import fr from "./i18n/messages/fr.json";

export type Locale = "ja" | "en" | "zh-Hans" | "zh-Hant" | "ko" | "es" | "fr";
export const LOCALES: Locale[] = ["ja", "en"]; // TEMP: 5言語は辞書到着後に追加
export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_COOKIE = "locale";

/** 言語切替UI用ラベル */
export const LOCALE_LABELS: Record<Locale, string> = {
  ja: "日本語",
  en: "English",
  "zh-Hans": "简体中文",
  "zh-Hant": "繁體中文",
  ko: "한국어",
  es: "Español",
  fr: "Français",
};

const DICTS: Record<string, Record<string, string>> = { en }; // TEMP

export type TFunc = (key: string, params?: Record<string, string | number>) => string;

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  let s = locale === "ja" ? key : DICTS[locale]?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
}

export function resolveLocale(v: string | undefined | null): Locale {
  return v && (LOCALES as string[]).includes(v) ? (v as Locale) : "ja";
}

/** ロケール付きパスを作る（jaはプレフィックスなし） */
export function localePath(locale: Locale, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** パス先頭のロケールプレフィックスを剥がす（無ければnull） */
export function stripLocalePrefix(pathname: string): { locale: Locale | null; rest: string } {
  for (const loc of LOCALES) {
    if (loc === DEFAULT_LOCALE) continue;
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      return { locale: loc, rest: pathname.slice(loc.length + 1) || "/" };
    }
  }
  return { locale: null, rest: pathname };
}
