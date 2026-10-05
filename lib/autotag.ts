// 人物タグ・カテゴリの自動付与（辞書 + プロフ単語の自動昇格・外部API/LLM不使用）
import { sql } from "./db";
import { classifyCategory, classifyWithAuto, computePromotedTags } from "./tag-rules";
import { listTagTargets, setPeopleTags } from "./queries";
import wikiHandles from "@/data/hikamer-wiki-handles.json";

/** ヒカマーwiki「ヒカマー一覧」に載っているハンドル集合（界隈所属の確定ソース） */
const HIKAMER_WIKI = new Set<string>((wikiHandles as string[]).map((h) => h.toLowerCase()));

function inHikamerWiki(handle: string | null | undefined): boolean {
  return !!handle && HIKAMER_WIKI.has(handle.toLowerCase());
}

/** 名前とプロフィール文からタグを判定 */
export function classifyTags(name: string, bio: string): string[] {
  return classifyWithAuto(name, bio, null);
}

/** 全員のプロフから自動昇格タグの集合を作る */
async function getPromoted() {
  const rows = await sql<{ bio: string }>(
    `SELECT COALESCE(NULLIF(x_description, ''), description, '') AS bio
     FROM people WHERE NOT is_hidden`
  );
  return computePromotedTags(rows.map((r) => r.bio));
}

/** 人物のタグとカテゴリを自動判定して保存（新規追加時フック用） */
export async function autoTagPerson(personId: string): Promise<void> {
  const rows = await sql<{ name: string; handle: string | null; bio: string; x_website: string | null; x_tweet_signals: string | null }>(
    `SELECT name, handle, x_website, x_tweet_signals, COALESCE(NULLIF(x_description, ''), description, '') AS bio
     FROM people WHERE id = $1`,
    [personId]
  );
  const p = rows[0];
  if (!p) return;
  const promoted = await getPromoted();
  const tags = classifyWithAuto(p.name, p.bio, promoted);
  const category = classifyCategory(
    p.name,
    [p.bio, p.x_website, p.x_tweet_signals].filter(Boolean).join("\n"),
    false,
    p.handle ?? "",
    inHikamerWiki(p.handle)
  );
  await sql(`UPDATE people SET tags = $2, category = $3 WHERE id = $1`, [
    personId,
    tags,
    category,
  ]);
}

/** 全員（またはタグ空の人）のタグ・カテゴリを再判定して保存 */
export async function retagEveryone(
  mode: "all" | "empty"
): Promise<{ total: number; updated: number; promoted: number }> {
  const rows = await listTagTargets("all");
  const promoted = computePromotedTags(rows.map((r) => r.bio));
  const targets = mode === "empty" ? rows.filter((r) => (r.tags ?? []).length === 0) : rows;
  const updates: { id: string; tags: string[]; category: string }[] = [];
  for (const r of targets) {
    const tags = classifyWithAuto(r.name, r.bio, promoted);
    const category = classifyCategory(
      r.name,
      [r.bio, r.x_website, r.x_tweet_signals].filter(Boolean).join("\n"),
      r.category === "ヒカマー",
      r.handle ?? "",
      inHikamerWiki(r.handle)
    );
    const cur = r.tags ?? [];
    const sameTags = tags.length === cur.length && tags.every((t, i) => t === cur[i]);
    if (!sameTags || category !== r.category) {
      updates.push({ id: r.id, tags, category });
    }
  }
  if (updates.length > 0) {
    await setPeopleTags(updates);
  }
  return { total: targets.length, updated: updates.length, promoted: promoted.size };
}
