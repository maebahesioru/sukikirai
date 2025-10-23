/**
 * スパムコメントのフィルタリング
 */

// ブロックする文字列のリスト
const BLOCKED_STRINGS = [
  '﷽', // Bismillah (スパムに使われることが多い)
];

// ブロックするキーワード（大文字小文字区別なし）
const BLOCKED_KEYWORDS = [
  'discord.gg',
  'discord.com/invite',
  'raid',
  'join now',
  't.me/', // Telegram
  'bit.ly',
  'tinyurl.com',
];

// URLパターン
const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(com|net|org|gg|io|me|tv|jp|co\.jp)\/[^\s]*/gi;

// ブロックする文字のUnicodeコードポイント範囲
const BLOCKED_UNICODE_RANGES = [
  { start: 0xFDFD, end: 0xFDFD }, // ﷽ (U+FDFD)
];

/**
 * コメント内容がスパムかどうかをチェック
 */
export function isSpamContent(content: string): { isSpam: boolean; reason?: string } {
  const contentLower = content.toLowerCase();

  // URLチェック
  if (URL_PATTERN.test(content)) {
    return { isSpam: true, reason: 'URLの投稿は禁止されています' };
  }

  // ブロックキーワードチェック
  for (const keyword of BLOCKED_KEYWORDS) {
    if (contentLower.includes(keyword.toLowerCase())) {
      return { isSpam: true, reason: '禁止されたキーワードが含まれています' };
    }
  }

  // ブロックリストの文字列チェック
  for (const blocked of BLOCKED_STRINGS) {
    if (content.includes(blocked)) {
      return { isSpam: true, reason: 'ブロックされた文字列が含まれています' };
    }
  }

  // Unicodeコードポイントチェック
  for (let i = 0; i < content.length; i++) {
    const codePoint = content.codePointAt(i);
    if (codePoint !== undefined) {
      for (const range of BLOCKED_UNICODE_RANGES) {
        if (codePoint >= range.start && codePoint <= range.end) {
          return { isSpam: true, reason: '禁止された文字が含まれています' };
        }
      }
    }
  }

  // 同じ文字の繰り返しチェック（5回以上連続）
  const repeatedCharPattern = /(.)\1{4,}/;
  if (repeatedCharPattern.test(content)) {
    return { isSpam: true, reason: '同じ文字の連続使用が検出されました' };
  }

  // 同じ単語の繰り返しチェック（3回以上）
  const words = content.split(/\s+/);
  const wordCount: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
      if (wordCount[word] >= 3) {
        return { isSpam: true, reason: '同じ単語の繰り返しが検出されました' };
      }
    }
  }

  // 極端に短いコメント（空白のみなど）
  if (content.trim().length < 1) {
    return { isSpam: true, reason: 'コメントが空です' };
  }

  return { isSpam: false };
}

/**
 * コメントの類似度を計算（簡易版）
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  // 長さの差が大きい場合は類似していない
  const lengthDiff = Math.abs(s1.length - s2.length);
  if (lengthDiff > Math.max(s1.length, s2.length) * 0.5) {
    return 0;
  }
  
  // 共通部分の長さを計算
  let commonChars = 0;
  const maxLength = Math.max(s1.length, s2.length);
  
  for (let i = 0; i < Math.min(s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) {
      commonChars++;
    }
  }
  
  return commonChars / maxLength;
}
