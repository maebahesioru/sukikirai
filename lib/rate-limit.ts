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

// ---- 「1日1回系」の新規トークン枠（cookieリセット連投対策・メモリ内のみ・保存なし）----
// 同一IPから「初めて見るトークン」で投票/評価できるのは1日 NEW_VOTER_MAX 個まで。
// 既知トークン（当日そのIPで既に活動済み）は制限なし＝1日1回の重複判定は各ルート側の既存ロジックが担う。
// ※プロセス再起動でリセットされる（既存のレート制限と同様）。
export const NEW_VOTER_MAX = 30;
const voterSets = new Map<string, { day: string; ids: Set<string> }>();

function jstDayKey(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/** 許可なら true。ipごとに「新しいトークン」を1日 NEW_VOTER_MAX 個まで受け付ける。 */
export function allowNewVoter(ip: string, token: string): boolean {
  const day = jstDayKey();
  if (voterSets.size > 20_000) {
    for (const [k, v] of voterSets) if (v.day !== day) voterSets.delete(k);
  }
  let entry = voterSets.get(ip);
  if (!entry || entry.day !== day) {
    entry = { day, ids: new Set() };
    voterSets.set(ip, entry);
  }
  if (entry.ids.has(token)) return true;
  if (entry.ids.size >= NEW_VOTER_MAX) return false;
  entry.ids.add(token);
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
