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

  const repeatedCharPattern = /(.)\1{4,}/;
  if (repeatedCharPattern.test(content)) {
    return { isSpam: true, reason: "同じ文字の連続使用が検出されました" };
  }

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
