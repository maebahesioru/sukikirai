// 2ch式の削除キー（投稿時に発行・本人が後からコメントを削除するための鍵）
import { createHash, randomBytes } from "crypto";

/** 紛らわしい文字（l/1/o/0 等）を除いた英数小文字 */
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** 削除キーを生成（8文字・棄却サンプリングで偏りなし） */
export function genDeleteKey(): string {
  let s = "";
  while (s.length < 8) {
    const buf = randomBytes(16);
    for (let i = 0; i < buf.length && s.length < 8; i++) {
      const v = buf[i];
      // 31*8=248 未満のみ採用（剰余バイアス排除）
      if (v >= 248) continue;
      s += ALPHABET[v % ALPHABET.length];
    }
  }
  return s;
}

/** 削除キーのハッシュ（DB保存用。前後空白と大文字小文字は寛容に扱う） */
export function hashDeleteKey(key: string): string {
  return createHash("sha256").update(key.trim().toLowerCase()).digest("hex");
}
