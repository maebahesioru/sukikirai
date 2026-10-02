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
 * 経路: client → Cloudflare → cloudflared(VM100) → Traefik → app。
 * CFエッジがXFFの先頭を「実クライアントIP」に正規化する（クライアント偽装のXFFは捨てられる・2026-10-02実測）。
 * TraefikのforwardedHeaders.trustedIPs設定で、内部ホップ(fd2a:4e87:e742::1)は末尾に付く。
 * よって「先頭エントリ」が実クライアントIP。直LANアクセスはTraefikがヘッダを置換するため偽装不可。
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
    if (parts.length > 0) return parts[0];
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}
