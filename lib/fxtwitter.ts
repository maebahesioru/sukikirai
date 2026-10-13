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

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: FxUser | null }>();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function parseJoined(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function fetchFxUser(handle: string): Promise<FxUser | null> {
  const key = handle.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

  try {
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      cache.set(key, { at: Date.now(), data: null });
      return null;
    }
    const data = await res.json();
    const u = data?.user;
    if (!u || !u.screen_name) {
      cache.set(key, { at: Date.now(), data: null });
      return null;
    }
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
    cache.set(key, { at: Date.now(), data: user });
    return user;
  } catch {
    // ネットワークエラーはキャッシュしない（一時障害を引きずらない）
    return null;
  }
}
