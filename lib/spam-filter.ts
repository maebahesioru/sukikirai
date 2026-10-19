/**
 * スパムコメントのフィルタリング（旧Supabase版から移植）
 */

const BLOCKED_STRINGS = [
  "\uFDFD", // Bismillah (スパムに使われることが多い)
];

const BLOCKED_KEYWORDS = [
  "discord.gg",
  "discord.com/invite",
  "raid",
  "join now",
  "t.me/", // Telegram
  "bit.ly",
  "tinyurl.com",
  "is.gd",
  "ow.ly",
  "buff.ly",
  "cutt.ly",
  "shorturl.at",
  "goo.gl",
];

const URL_PATTERN =
  /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(com|net|org|gg|io|me|tv|jp|co\.jp)\/[^\s]*/gi;

const BLOCKED_UNICODE_RANGES = [{ start: 0xfdfd, end: 0xfdfd }];

/** 「同じ単語の繰り返し」判定を適用する最大文字数。これ以上の長文（WHOIS・ログ・引用）は判定しない */
const WORD_ECHO_MAX_LENGTH = 200;
/** URLを差し替えただけの長文コピペを弾く閾値（この文字数以上の本文は類似判定を残す） */
const URL_BODY_MIN_LENGTH = 20;

export function isSpamContent(
  content: string,
  opts?: { allowUrls?: boolean }
): { isSpam: boolean; reason?: string } {
  const contentLower = content.toLowerCase();

  // コメント欄ではURLを許可（allowUrls）。短縮URL等のスパムキーワードは下で引き続きブロック。
  if (!opts?.allowUrls && URL_PATTERN.test(content)) {
    return { isSpam: true, reason: "URLの投稿は禁止されています" };
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    if (contentLower.includes(keyword.toLowerCase())) {
      return { isSpam: true, reason: "禁止されたキーワードが含まれています" };
    }
  }

  for (const blocked of BLOCKED_STRINGS) {
    if (content.includes(blocked)) {
      return { isSpam: true, reason: "ブロックされた文字列が含まれています" };
    }
  }

  for (let i = 0; i < content.length; i++) {
    const codePoint = content.codePointAt(i);
    if (codePoint !== undefined) {
      for (const range of BLOCKED_UNICODE_RANGES) {
        if (codePoint >= range.start && codePoint <= range.end) {
          return { isSpam: true, reason: "禁止された文字が含まれています" };
        }
      }
    }
  }

  // 同じ文字の5連続以上。ただし空白・罫線・区切り記号の繰り返しは対象外（2026-10-19）
  // 背景: WHOIS/ログ/コード等の整形出力は空白や罫線の連続が正常。「あああああ」「AAAAA」等は引き続き検出。
  const repeatedCharPattern = /([^\s\-–—=*_~#|+.,:;・])\1{4,}/u;
  if (repeatedCharPattern.test(content)) {
    return { isSpam: true, reason: "同じ文字の連続使用が検出されました" };
  }

  // 同じ単語の3回以上の繰り返し。200字以上の長文は対象外（2026-10-19）
  // 背景: WHOIS（Domain Status: が3回等）やログ/引用は項目名の反復が正常。短い「raid raid raid」系は引き続き検出。
  if (content.length < WORD_ECHO_MAX_LENGTH) {
    const words = content.split(/\s+/);
    const wordCount: Record<string, number> = {};
    for (const word of words) {
      if (word.length > 2) {
        wordCount[word] = (wordCount[word] ?? 0) + 1;
        if (wordCount[word] >= 3) {
          return { isSpam: true, reason: "同じ単語の繰り返しが検出されました" };
        }
      }
    }
  }

  if (content.trim().length < 1) {
    return { isSpam: true, reason: "コメントが空です" };
  }

  return { isSpam: false };
}

/** コメントの類似度（簡易） */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const lengthDiff = Math.abs(s1.length - s2.length);
  if (lengthDiff > Math.max(s1.length, s2.length) * 0.5) {
    return 0;
  }

  let commonChars = 0;
  const maxLength = Math.max(s1.length, s2.length);

  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) {
      commonChars++;
    }
  }

  return commonChars / maxLength;
}

const URL_MATCH = /https?:\/\/[^\s]+/gi;

/** URLを取り除いた本文（空白は1つに正規化） */
export function stripUrls(text: string): string {
  return text.replace(URL_MATCH, " ").replace(/\s+/g, " ").trim();
}

/** 投稿に含まれるURLの集合キー（クエリ/フラグメント除去・小文字化・重複除去・ソート） */
function urlKey(text: string): string {
  const found = text.match(URL_MATCH) ?? [];
  const normalized = found.map((u) =>
    u.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase()
  );
  return [...new Set(normalized)].sort().join("\n");
}

/**
 * 連投（重複投稿）かどうかの判定（2026-10-19）
 *
 * 従来は本文全体の類似度（先頭からの一致率≥0.9）だけで判定していたため、
 * 同じ人物の別ツイートURL（ID部分だけ違う）を貼ると「類似」と誤判定していた。
 *
 * 現在の規則:
 * - 完全一致 → 重複
 * - 双方にURLがあり、URLが異なる → 別の投稿として扱う（本文が20字以上の長文コピペなら従来どおり拒否）
 * - URLが同じ or 双方URLなし → URLを除いた本文の類似度で判定
 */
export function isDuplicateContent(a: string, b: string, threshold = 0.9): boolean {
  const ta = a.trim();
  const tb = b.trim();
  if (ta === tb) return true;

  const ua = urlKey(ta);
  const ub = urlKey(tb);
  if (ua || ub) {
    const bodyA = stripUrls(ta);
    if (ua !== ub) {
      if (bodyA.length < URL_BODY_MIN_LENGTH) return false;
      return calculateSimilarity(bodyA, stripUrls(tb)) >= threshold;
    }
    return calculateSimilarity(bodyA, stripUrls(tb)) >= threshold;
  }

  return calculateSimilarity(ta, tb) >= threshold;
}
