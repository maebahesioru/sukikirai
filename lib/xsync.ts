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
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(p.handle)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    // 凍結・削除・改名（302/404/410）→ スレ落ち扱い（日次チェッカーと同じ判定）
    if (res.status === 302 || res.status === 404 || res.status === 410) {
      await sql(`UPDATE people SET x_status = 'missing', x_checked_at = now() WHERE id = $1`, [p.id]);
      return;
    }
    if (!res.ok) return; // 一時的なエラー等は何もしない

    const data = (await res.json()) as {
      user?: { id?: string; name?: string; description?: string; avatar_url?: string; followers?: number };
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

    await sql(
      `UPDATE people SET
         x_status = 'ok',
         x_user_id = $2,
         followers = $3,
         x_description = $4,
         name = CASE WHEN $5 <> '' THEN $5 ELSE name END,
         avatar_url = COALESCE($6, avatar_url),
         x_checked_at = now()
       WHERE id = $1`,
      [p.id, uid, followers, desc, name, avatar]
    );
  } catch {
    // 一時的なネットワークエラーは無視（日次チェッカーが拾う）
  } finally {
    inflight.delete(p.id);
  }
}
