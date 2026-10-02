// プロセス内の簡易レートリミッター（単一インスタンス用）
const buckets = new Map<string, number[]>();

/** 許可なら true。keyごとに windowMs 内 max 回まで。 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  // メモリ保護: バケットが増えすぎたら24時間触られていないエントリを掃除
  if (buckets.size > 20_000) {
    for (const [k, arr] of buckets) {
      const newest = arr[arr.length - 1] ?? 0;
      if (now - newest > 86_400_000) buckets.delete(k);
    }
  }
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/**
 * クライアントIP取得。
 * Cloudflare経由なら CF-Connecting-IP が最も信頼できる（CFが必ず付与/上書きする）。
 * XFFの先頭はクライアントが偽装できるため使わない（フォールバック時は最後のホップ）。
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const cf = h.get("cf-connecting-ip");
  if (cf && cf.trim()) return cf.trim();
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
