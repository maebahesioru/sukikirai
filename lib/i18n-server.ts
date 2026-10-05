// i18n サーバー用ヘルパー（サーバーコンポーネント/route handlerから使用）
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, translate, type Locale, type TFunc } from "./i18n-core";

export async function getLocale(): Promise<Locale> {
  try {
    // 1) middlewareが付与する x-locale（/en/... 等のプレフィックスURL）
    const h = await headers();
    const fromHeader = h.get("x-locale");
    if (fromHeader) return resolveLocale(fromHeader);
    // 2) cookie（言語切替ボタン）
    const c = await cookies();
    return resolveLocale(c.get(LOCALE_COOKIE)?.value);
  } catch {
    return "ja";
  }
}

/** サーバーコンポーネント用: `const t = await getServerT();` して `t("日本語キー")` */
export async function getServerT(): Promise<TFunc> {
  const locale = await getLocale();
  return (key, params) => translate(locale, key, params);
}
