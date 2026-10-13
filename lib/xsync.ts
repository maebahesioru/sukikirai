// 人物プロフィールのオンデマンド同期
// 人物ページが開かれたとき、1時間以上確認していない人だけバックグラウンドで fxTwitter から最新化する。
// （表示は現在の値を即返し、次回アクセス時に新データが見える stale-while-revalidate 方式）
import { sql, sql1 } from "./db";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FRESH_MS = 60 * 60 * 1000; // 1時間以内に確認済みならスキップ
const inflight = new Set<string>();

export async function maybeRefreshPersonProfile(personId: string): Promise<void> {
  const p = await sql1<{
    id: string;
    handle: string | null;
    x_user_id: string | null;
    x_checked_at: Date | string | null;
    x_status: string | null;
  }>(`SELECT id, handle, x_user_id, x_checked_at, x_status FROM people WHERE id = $1`, [personId]);
  if (!p || !p.handle) return;
  if (p.x_status === "reused") return; // 旧ハンドルを別人が取得済みのものは触らない

  const checked = p.x_checked_at ? new Date(p.x_checked_at).getTime() : 0;
  if (checked > 0 && Date.now() - checked < FRESH_MS) return;
  if (inflight.has(p.id)) return;
  inflight.add(p.id);

  try {
    const handle = p.handle; // クロージャ内でTSのナローイングを保つためconstで保持
    const doFetch = () =>
      fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        redirect: "manual",
        signal: AbortSignal.timeout(10000),
      });
    let res = await doFetch();

    // 凍結・削除・改名（302/404/410）→ スレ落ち扱い（日次チェッカーと同じ判定）。
    // ただしfxtwitterが稀に一時的な404を返すため、1回だけ再試行してから確定する
    // （2026-10-13 でばねずみ誤アーカイブ事例）
    if (res.status === 302 || res.status === 404 || res.status === 410) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        res = await doFetch();
      } catch {
        /* 再試行も例外 → 下の判定に進む */
      }
      if (res.status === 302 || res.status === 404 || res.status === 410) {
        await sql(`UPDATE people SET x_status = 'missing', x_checked_at = now() WHERE id = $1`, [p.id]);
        return;
      }
    }
    if (!res.ok) return; // 一時的なエラー等は何もしない

    const data = (await res.json()) as {
      user?: {
        id?: string;
        name?: string;
        description?: string;
        avatar_url?: string;
        banner_url?: string;
        followers?: number;
        following?: number;
        likes?: number;
        media_count?: number;
        tweets?: number;
        location?: string;
        joined?: string;
        protected?: boolean;
        website?: { url?: string };
        verification?: { verified?: boolean; type?: string };
      };
    };
    const u = data.user;
    if (!u) {
      await sql(`UPDATE people SET x_status = 'missing', x_checked_at = now() WHERE id = $1`, [p.id]);
      return;
    }

    const uid = String(u.id ?? "");
    if (p.x_user_id && uid && uid !== p.x_user_id) {
      await sql(`UPDATE people SET x_status = 'reused', x_checked_at = now() WHERE id = $1`, [p.id]);
      return;
    }

    const name = String(u.name ?? "").trim().slice(0, 100);
    const desc = String(u.description ?? "").slice(0, 500);
    const followers = Number.isFinite(u.followers) ? Math.max(0, u.followers as number) : 0;
    const avatar =
      typeof u.avatar_url === "string" && u.avatar_url.startsWith("http")
        ? u.avatar_url.slice(0, 500)
        : null;
    const website =
      typeof u.website?.url === "string" && u.website.url.startsWith("http")
        ? u.website.url.slice(0, 300)
        : null;
    const banner =
      typeof u.banner_url === "string" && u.banner_url.startsWith("http")
        ? u.banner_url.slice(0, 500)
        : null;
    const num = (v: unknown) => (Number.isFinite(v as number) ? Math.max(0, Math.floor(v as number)) : null);
    const location = typeof u.location === "string" && u.location.trim() ? u.location.trim().slice(0, 200) : null;
    const joinedD = u.joined ? new Date(u.joined) : null;
    const joinedIso = joinedD && !Number.isNaN(joinedD.getTime()) ? joinedD.toISOString() : null;

    await sql(
      `UPDATE people SET
         x_status = 'ok',
         x_user_id = $2,
         followers = $3,
         x_description = $4,
         name = CASE WHEN $5 <> '' THEN $5 ELSE name END,
         avatar_url = COALESCE($6, avatar_url),
         x_website = $7,
         x_location = $8,
         x_banner_url = COALESCE($9, x_banner_url),
         x_following = $10,
         x_likes = $11,
         x_media_count = $12,
         x_tweets = $13,
         x_joined_at = COALESCE($14::timestamptz, x_joined_at),
         x_protected = $15,
         x_verified = $16,
         x_verified_type = $17,
         x_checked_at = now()
       WHERE id = $1`,
      [
        p.id, uid, followers, desc, name, avatar, website,
        location, banner, num(u.following), num(u.likes), num(u.media_count), num(u.tweets),
        joinedIso, !!u.protected, !!(u.verification?.verified),
        u.verification?.type ? String(u.verification.type).slice(0, 20) : null,
      ]
    );
  } catch {
    // 一時的なネットワークエラーは無視（日次チェッカーが拾う）
  } finally {
    inflight.delete(p.id);
  }
}
