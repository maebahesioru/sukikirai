// fxTwitter API（認証不要）でXプロフィールを取得。5分キャッシュ。
// 2026-10-13: fxTwitterが返す全カラム（location/banner/following/likes/media/tweets/joined/protected/verified/website）を保存できるよう拡張。

export interface FxUser {
  id: string;
  screenName: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followers: number;
  following: number;
  likes: number;
  mediaCount: number;
  tweets: number;
  location: string | null;
  joinedAt: string | null;
  protected: boolean;
  verified: boolean;
  verifiedType: string | null;
  website: string | null;
}

// 取得失敗の理由（2026-10-30追加）
//   notfound : X側にそのIDが存在しない（削除・改名・誤入力）
//   suspended: X側で凍結されている（fxtwitter が reason:"suspended" を返す）
//   upstream : fxtwitter自体の一時障害（429/5xx/タイムアウト）。時間をおけば成功しうる
export type FxLookupError = "notfound" | "suspended" | "upstream";
export type FxLookup = { user: FxUser } | { error: FxLookupError };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: FxLookup }>();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parseJoined(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

type FxOnce =
  | { kind: "ok"; user: FxUser }
  | { kind: "err"; error: "notfound" | "suspended" }
  | { kind: "transient" };

async function fetchFxOnce(handle: string): Promise<FxOnce> {
  const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 404) {
    // 凍結は reason:"suspended" で区別できる（例: {"code":404,"reason":"suspended"}）
    let reason = "";
    try {
      const j = (await res.json()) as { reason?: unknown; message?: unknown };
      reason = `${j?.reason ?? ""} ${j?.message ?? ""}`;
    } catch {
      /* JSONでなくても404はnotfound扱い */
    }
    return { kind: "err", error: /suspend/i.test(reason) ? "suspended" : "notfound" };
  }
  if (!res.ok) return { kind: "transient" }; // 429/5xx
  const data = await res.json();
  const u = data?.user;
  if (!u || !u.screen_name) return { kind: "err", error: "notfound" };
  const vf = (u.verification ?? {}) as { verified?: boolean; type?: string };
  const user: FxUser = {
    id: String(u.id ?? ""),
    screenName: String(u.screen_name),
    name: String(u.name ?? u.screen_name),
    description: String(u.description ?? ""),
    avatarUrl: typeof u.avatar_url === "string" ? u.avatar_url.slice(0, 500) : null,
    bannerUrl: typeof u.banner_url === "string" ? u.banner_url.slice(0, 500) : null,
    followers: Number(u.followers ?? 0) || 0,
    following: Number(u.following ?? 0) || 0,
    likes: Number(u.likes ?? 0) || 0,
    mediaCount: Number(u.media_count ?? 0) || 0,
    tweets: Number(u.tweets ?? 0) || 0,
    location:
      typeof u.location === "string" && u.location.trim() ? u.location.trim().slice(0, 200) : null,
    joinedAt: parseJoined(u.joined),
    protected: !!u.protected,
    verified: !!vf.verified,
    verifiedType: vf.type ? String(vf.type).slice(0, 20) : null,
    website:
      typeof u.website?.url === "string" && u.website.url.startsWith("http")
        ? u.website.url.slice(0, 300)
        : null,
  };
  return { kind: "ok", user };
}

/**
 * 失敗理由つきの取得。一時障害（429/5xx/タイムアウト）だけ1回だけ短い待機で再試行する。
 * 一時障害はキャッシュしない（次のリクエストで再試行できるように）。
 */
export async function fetchFxUserDetailed(handle: string): Promise<FxLookup> {
  const key = handle.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  const remember = (r: FxLookup): FxLookup => {
    cache.set(key, { at: Date.now(), data: r });
    return r;
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetchFxOnce(handle);
      if (r.kind === "ok") return remember({ user: r.user });
      if (r.kind === "err") return remember({ error: r.error });
    } catch {
      /* ネットワークエラーは一時障害として再試行 */
    }
    if (attempt === 0) await new Promise((res) => setTimeout(res, 400));
  }
  return { error: "upstream" };
}

export async function fetchFxUser(handle: string): Promise<FxUser | null> {
  const r = await fetchFxUserDetailed(handle);
  return "user" in r ? r.user : null;
}
