// i18n サーバー用ヘルパー（サーバーコンポーネント/route handlerから使用）
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, registerDict, resolveLocale, translate, type Locale, type TFunc } from "./i18n-core";
import en from "./i18n/messages/en.json";
import zhHans from "./i18n/messages/zh-Hans.json";
import zhHant from "./i18n/messages/zh-Hant.json";
import ko from "./i18n/messages/ko.json";
import es from "./i18n/messages/es.json";
import fr from "./i18n/messages/fr.json";

/** サーバー側の辞書（クライアントには配らない） */
const SERVER_DICTS: Record<string, Record<string, string>> = {
  en,
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  ko,
  es,
  fr,
};
for (const [loc, dict] of Object.entries(SERVER_DICTS)) {
  registerDict(loc as Locale, dict);
}

/** クライアント（LocaleProvider）へ渡す辞書。jaはnull（日本語キーそのまま） */
export function getMessages(locale: Locale): Record<string, string> | null {
  return locale === "ja" ? null : SERVER_DICTS[locale] ?? null;
}

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
