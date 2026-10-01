// プロセス内の簡易レートリミッター（単一インスタンス用）
const buckets = new Map<string, number[]>();

/** 許可なら true。keyごとに windowMs 内 max 回まで。 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  return true;
}

/** クライアントIP取得（プロキシ経由） */
export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("cf-connecting-ip") || h.get("x-real-ip") || "unknown";
}
