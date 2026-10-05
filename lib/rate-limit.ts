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
// さらに短時間の連投（cookieリセット連打）を抑えるため、10分あたり NEW_VOTER_BURST 個までに制限。
// 既知トークン（当日そのIPで既に活動済み）は制限なし＝1日1回の重複判定は各ルート側の既存ロジックが担う。
// ※プロセス再起動でリセットされる（既存のレート制限と同様）。
export const NEW_VOTER_MAX = 40;
export const NEW_VOTER_BURST = 8;
const voterSets = new Map<string, { day: string; ids: Set<string> }>();

function jstDayKey(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

export type NewVoterResult = { ok: true } | { ok: false; reason: "burst" | "day" };

/** 許可なら {ok:true}。ipごとに「新しいトークン」を1日 NEW_VOTER_MAX 個・10分 NEW_VOTER_BURST 個まで。 */
export function allowNewVoter(ip: string, token: string): NewVoterResult {
  const day = jstDayKey();
  if (voterSets.size > 20_000) {
    for (const [k, v] of voterSets) if (v.day !== day) voterSets.delete(k);
  }
  let entry = voterSets.get(ip);
  if (!entry || entry.day !== day) {
    entry = { day, ids: new Set() };
    voterSets.set(ip, entry);
  }
  if (entry.ids.has(token)) return { ok: true };
  // 新規トークンの連投チェック（バースト）
  if (!rateLimit(`newvoter:burst:${ip}`, NEW_VOTER_BURST, 10 * 60 * 1000)) {
    return { ok: false, reason: "burst" };
  }
  if (entry.ids.size >= NEW_VOTER_MAX) return { ok: false, reason: "day" };
  entry.ids.add(token);
  return { ok: true };
}

// ---- 端末フィンガープリントによる重複投票防止（cookieリセット対策の本丸・メモリ内のみ・保存なし）----
// cookieを消しても端末は同じ。同一端末(fp)が同一対象に「同じJST日」に投票/評価するのを防ぐ。
const fpVotes = new Map<string, string>();

/** 同一端末(fp)が同一対象に今日既に投票/評価済みなら true。 */
export function fpTargetBlocked(fp: string, kind: "vote" | "eval" | "pollvote", targetId: string): boolean {
  const day = jstDayKey();
  if (fpVotes.size > 50_000) {
    for (const [k, d] of fpVotes) if (d !== day) fpVotes.delete(k);
  }
  return fpVotes.get(`${fp}:${kind}:${targetId}`) === day;
}

/** 投票/評価の成功時に呼ぶ（当日分の記録）。 */
export function markFpTarget(fp: string, kind: "vote" | "eval" | "pollvote", targetId: string): void {
  fpVotes.set(`${fp}:${kind}:${targetId}`, jstDayKey());
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
