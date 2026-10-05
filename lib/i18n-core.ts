// i18nコア（サーバー・クライアント共用・"use client"を付けないこと）
// 方針: gettext式 — 日本語文字列そのものをキーにする。未訳はjaのままフォールバック。
import en from "./i18n/messages/en.json";

export type Locale = "ja" | "en";
export const LOCALES: Locale[] = ["ja", "en"];
export const DEFAULT_LOCALE: Locale = "ja";
export const LOCALE_COOKIE = "locale";

const DICTS: Record<string, Record<string, string>> = { en };

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
  return v === "en" ? "en" : "ja";
}
