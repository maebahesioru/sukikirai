// 人物タグの自動付与（キーワード辞書方式・外部API/LLM不使用・完全ローカル）
import { sql } from "./db";
import { classifyByRules } from "./tag-rules";

/** 名前とプロフィール文からタグを判定（純ローカル・即時） */
export function classifyTags(name: string, bio: string): string[] {
  return classifyByRules(name, bio);
}

/** 人物のタグを自動判定して保存 */
export async function autoTagPerson(personId: string): Promise<void> {
  const rows = await sql<{ name: string; bio: string }>(
    `SELECT name, COALESCE(NULLIF(x_description, ''), description, '') AS bio
     FROM people WHERE id = $1`,
    [personId]
  );
  const p = rows[0];
  if (!p) return;
  const tags = classifyByRules(p.name, p.bio);
  await sql(`UPDATE people SET tags = $2 WHERE id = $1`, [personId, tags]);
}
