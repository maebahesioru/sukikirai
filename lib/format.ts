import { formatInTimeZone } from "date-fns-tz";

/** JSTフォーマット（例: 2026/10/01 12:34） */
export function formatJST(
  input: string | Date | null | undefined,
  fmt = "yyyy/MM/dd HH:mm"
): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  return formatInTimeZone(d, "Asia/Tokyo", fmt);
}

/** 「3分前」のような相対表記（7日以上は日付） */
export function timeAgo(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}日前`;
  return formatJST(d, "yyyy/MM/dd");
}

/** 数値の3桁区切り */
export function num(n: number | null | undefined): string {
  if (n == null) return "0";
  return n.toLocaleString("ja-JP");
}

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 2ch風の絶対時刻（JST固定・秒まで）: 2026/10/03(Sat) 19:14:37 */
export function fmtTime2ch(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const j = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${j.getUTCFullYear()}/${p(j.getUTCMonth() + 1)}/${p(j.getUTCDate())}(${
    WEEKDAYS_EN[j.getUTCDay()]
  }) ${p(j.getUTCHours())}:${p(j.getUTCMinutes())}:${p(j.getUTCSeconds())}`;
}
