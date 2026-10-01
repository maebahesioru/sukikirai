// fxTwitter API（認証不要）でXプロフィールを取得。5分キャッシュ。

export interface FxUser {
  id: string;
  screenName: string;
  name: string;
  description: string;
  avatarUrl: string | null;
  followers: number;
  protected: boolean;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: FxUser | null }>();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

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
    const user: FxUser = {
      id: String(u.id ?? ""),
      screenName: String(u.screen_name),
      name: String(u.name ?? u.screen_name),
      description: String(u.description ?? ""),
      avatarUrl: typeof u.avatar_url === "string" ? u.avatar_url : null,
      followers: Number(u.followers ?? 0),
      protected: !!u.protected,
    };
    cache.set(key, { at: Date.now(), data: user });
    return user;
  } catch {
    // ネットワークエラーはキャッシュしない（一時障害を引きずらない）
    return null;
  }
}
