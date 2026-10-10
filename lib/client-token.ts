"use client";

import Cookies from "js-cookie";

/**
 * user_token を取得する（2026-10-10）。
 * Cookie が消えても localStorage から復元して Cookie を再設定する。
 * スマホ（Xアプリ内ブラウザ等）で Cookie が飛ぶ環境対策。無ければ null。
 */
export function getUserToken(): string | null {
  const c = Cookies.get("user_token");
  if (c) return c;
  try {
    const stored = localStorage.getItem("sk_token");
    if (stored) {
      Cookies.set("user_token", stored, { expires: 365, sameSite: "strict" });
      return stored;
    }
  } catch {
    /* noop */
  }
  return null;
}
