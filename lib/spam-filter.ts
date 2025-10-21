/**
 * スパムコメントのフィルタリング
 */

// ブロックする文字列のリスト
const BLOCKED_STRINGS = [
  '﷽', // Bismillah (スパムに使われることが多い)
];

// ブロックする文字のUnicodeコードポイント範囲
const BLOCKED_UNICODE_RANGES = [
  { start: 0xFDFD, end: 0xFDFD }, // ﷽ (U+FDFD)
];

/**
 * コメント内容がスパムかどうかをチェック
 */
export function isSpamContent(content: string): { isSpam: boolean; reason?: string } {
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
