// 2ch互換エンドポイント（専ブラ用）のヘルパー。
// subject.txt / dat / SETTING.TXT を cp932 で配信し、Siki等の legacy_dat ハンドラで読めるようにする。
// 810ch実測フォーマット準拠: dat 1行 = 名前<>メール<>日付 ID:xxxx<>本文<>タイトル（5フィールド）

import { createHash } from "crypto";
import iconv from "iconv-lite";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const NONAME = "名無しさん";
export const ABONE = "あぼーん<>あぼーん<>あぼーん<>あぼーん<>あぼーん";

// cp932にエンコードできない文字（絵文字など）を数値文字参照 &#N; に置換する。
// 810ch実測フォーマット: 絵文字は &#128560; のような10進数値参照のASCIIとしてdatに載り、
// 専ブラ（Siki等）側が文字参照をデコードして絵文字に戻す。
// iconv-lite の cp932 は該当文字をそのまま '?' にしてしまうため、事前に置換しておく。
// ⚠️ & をエスケープする処理（esc2ch / sanitizeField）の「後」に適用すること。
//   先に適用すると & が &amp; になり参照が壊れる。
function entityizeUnmappable(s: string): string {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp < 0x80) {
      out += ch;
      continue;
    }
    const buf = iconv.encode(ch, "cp932");
    // マップ不能な文字は '?' 1バイトになる（cp932の正規文字は1〜2バイト）
    if (buf.length === 1 && buf[0] === 0x3f) {
      out += `&#${cp};`;
    } else {
      out += ch;
    }
  }
  return out;
}

// スレッドキー = スレ立て時刻のUNIX秒。
// ⚠️ 5ch互換ブラウザ（Siki等）は threadkey をそのまま「epoch秒」とみなして
//    pubdate = key*1000 でスレ立て日時を表示する（810ch実測: key 1781526063 → 2026/06/15）。
//    ランダムなキーだと日時が2237年などになるため、必ず実際の作成時刻（秒）を使う。
//    同一秒の衝突はソート順で+1秒ずらす（表示が1秒ズレるだけで無害）。
export function assignThreadKeys<T extends { id: string; created_at: string }>(
  rows: T[]
): Map<string, string> {
  const secOf = (r: T) => Math.floor(new Date(r.created_at).getTime() / 1000);
  const sorted = [...rows].sort(
    (a, b) => secOf(a) - secOf(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const r of sorted) {
    let k = secOf(r);
    if (!Number.isFinite(k) || k <= 0) k = 1;
    while (used.has(String(k))) k++;
    used.add(String(k));
    map.set(r.id, String(k));
  }
  return map;
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
  return entityizeUnmappable(
    s
      .replace(/[\r\n\t]+/g, " ")
      .replace(/</g, "＜")
      .replace(/>/g, "＞")
      .replace(/&/g, "＆")
      .trim()
      .slice(0, max)
  );
}

// 本文用: HTMLエスケープ + 改行を <br> に（2ch dat 形式）
export function esc2ch(s: string): string {
  return entityizeUnmappable(
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\r?\n/g, "<br>")
  );
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
  title: string,
  mail = ""
): string {
  return [name, mail, `${date} ID:${id}`, message, title].join("<>");
}
