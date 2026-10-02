// 2ch互換エンドポイント（専ブラ用）のヘルパー。
// subject.txt / dat / SETTING.TXT を cp932 で配信し、Siki等の legacy_dat ハンドラで読めるようにする。
// 810ch実測フォーマット準拠: dat 1行 = 名前<>メール<>日付 ID:xxxx<>本文<>タイトル（5フィールド）

import { createHash } from "crypto";
import iconv from "iconv-lite";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const NONAME = "名無しさん";

// スレッドキー: サイトIDから決定的な10桁数字を作る。
// ⚠️ 5ch互換ブラウザ（Siki等）はスレキーを「10桁」とみなして切り詰める/URLを組み立てるため、
//    12桁だと `/dat/{10桁}.dat` に化けて404になる（2026-10-02実測）。必ず10桁にする。
export function threadKey(id: string): string {
  const h = createHash("sha256").update("suki2ch:" + id).digest("hex");
  const n = parseInt(h.slice(0, 12), 16) % 10_000_000_000;
  return String(n).padStart(10, "0");
}

// 書き込みID: cookie_id のハッシュから決定的に9文字（匿名・追跡不能）
export function anonId(cookieId: string | null, fallbackId: string): string {
  const h = createHash("sha256")
    .update(cookieId || "anon:" + fallbackId)
    .digest("base64");
  return h.replace(/[^A-Za-z0-9]/g, "").slice(0, 9);
}

// 810ch準拠: 「2026/08/30(Sun) 21:24:41.096」（JST・英語曜日・ミリ秒3桁）
export function fmt2chDate(input: string | Date): string {
  const jst = new Date(new Date(input).getTime() + 9 * 3600 * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return (
    `${jst.getUTCFullYear()}/${p(jst.getUTCMonth() + 1)}/${p(jst.getUTCDate())}` +
    `(${WEEKDAYS[jst.getUTCDay()]}) ` +
    `${p(jst.getUTCHours())}:${p(jst.getUTCMinutes())}:${p(jst.getUTCSeconds())}` +
    `.${p(jst.getUTCMilliseconds(), 3)}`
  );
}

// 名前・タイトル用: 区切り文字(<>,)を壊す文字を全角に置換
export function sanitizeField(s: string, max = 200): string {
  return s
    .replace(/[\r\n\t]+/g, " ")
    .replace(/</g, "＜")
    .replace(/>/g, "＞")
    .replace(/&/g, "＆")
    .trim()
    .slice(0, max);
}

// 本文用: HTMLエスケープ + 改行を <br> に（2ch dat 形式）
export function esc2ch(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");
}

// cp932 でレスポンス（810chと同じ Content-Type）
export function to2chResponse(body: string, cacheSeconds = 60): Response {
  const buf = iconv.encode(body, "cp932");
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=shift_jis",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": `public, s-maxage=${cacheSeconds}`,
    },
  });
}

export function datLine(
  name: string,
  date: string,
  id: string,
  message: string,
  title: string
): string {
  return [name, "", `${date} ID:${id}`, message, title].join("<>");
}
