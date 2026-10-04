// 入力バリデーション共通ヘルパー

export const TOKEN_RE = /^[a-f0-9]{64}$/i;

export function isValidToken(s: unknown): s is string {
  return typeof s === "string" && TOKEN_RE.test(s);
}

/** 端末フィンガープリント（クライアント生成のハッシュ・16進） */
export const FP_RE = /^[a-z0-9]{8,80}$/i;

export function isValidFp(s: unknown): s is string {
  return typeof s === "string" && FP_RE.test(s);
}

/** 半角1・全角2で数える（旧サイト互換） */
export function charCount(s: string): number {
  let c = 0;
  for (let i = 0; i < s.length; i++) {
    c += s.charCodeAt(i) <= 0x7f ? 1 : 2;
  }
  return c;
}

export function isUuid(s: unknown): s is string {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
  );
}

export function str(v: unknown, max = 1000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
