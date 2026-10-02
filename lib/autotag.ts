// 人物タグの自動付与（LLM分類）
// 必要なenv: AUTOTAG_API_KEY（未設定なら機能無効）。任意: AUTOTAG_API_URL / AUTOTAG_MODEL
import { sql } from "./db";

const API_URL =
  process.env.AUTOTAG_API_URL || "https://opencode.ai/zen/go/v1/chat/completions";
const API_KEY = process.env.AUTOTAG_API_KEY || "";
const MODEL = process.env.AUTOTAG_MODEL || "deepseek-v4-flash";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/** タグとして許容する形式（日本語・英数・一部記号・12文字以内） */
const TAG_RE = /^[ぁ-んァ-ヶー一-龠a-zA-Z0-9・_+\-]{1,12}$/;

export function buildTagPrompt(name: string, handle: string | null, bio: string): string {
  return `あなたはX(旧Twitter)ユーザーにコミュニティタグを付ける分類器です。出力はJSON配列のみ。前置き・解説・コードブロックは禁止。
例: ["ヒカマー","技術系ヒカマー"] / []

既存語彙（優先して使う）: ヒカマー, 成人ヒカマー, 技術系ヒカマー, 右翼マー, 左翼マー, 反ネトウヨ, 反ヒカマー, ブルアカマー, おぜう派, いいねマー, タグ荒らしマー, X

人物: ${name} (@${handle ?? "-"})
プロフィール: ${bio || "(空)"}

ルール:
- ヒカマー/ヒカマニ界隈の人物と自己紹介などから明確に分かる場合は「ヒカマー」。確証がなければ付けない。
- 名前が「◯◯_mania」「◯◯マニア」「◯◯マニ」「◯◯キン」「◯◯bot」などヒカマー界隈の命名規則の場合は「ヒカマー」と判断してよい（プロフィールが空でも可）。
- 18禁・成人向け活動の明示がある場合は「成人ヒカマー」。
- 技術・プログラミング・開発色が強い場合は「技術系ヒカマー」を追加。
- 政治系（右翼マー/左翼マー/反ネトウヨ）は本人の明確な自己言及がある場合のみ。推測は禁止。
- 既存語彙に無い明確な特徴（音ゲー・カラオケ・特定作品など）は「◯◯マー」形式（8文字以内）で最大1個だけ新規作成してよい。弱い特徴なら付けない。
- 最大3個。該当なしなら [] のみ。`;
}

export function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") continue;
    const s = t.trim().replace(/^[#＃]+/, "");
    if (s && TAG_RE.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= 3) break;
  }
  return out;
}

/** タグ分類。失敗時は null（呼び出し側は既存タグを保持する） */
export async function classifyTags(
  name: string,
  handle: string | null,
  bio: string
): Promise<string[] | null> {
  if (!API_KEY) return null;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
        "User-Agent": UA,
        "x-opencode-session": crypto.randomUUID(),
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: buildTagPrompt(name, handle, bio) }],
        temperature: 0,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? "";
    const m = content.match(/\[[\s\S]*\]/);
    if (!m) return null;
    return sanitizeTags(JSON.parse(m[0]));
  } catch {
    return null;
  }
}

/** 人物のタグを分類して保存（失敗時は何もしない） */
export async function autoTagPerson(personId: string): Promise<void> {
  if (!API_KEY) return;
  const rows = await sql<{ name: string; handle: string | null; bio: string }>(
    `SELECT name, handle, COALESCE(NULLIF(x_description, ''), description, '') AS bio
     FROM people WHERE id = $1`,
    [personId]
  );
  const p = rows[0];
  if (!p) return;
  const tags = await classifyTags(p.name, p.handle, p.bio);
  if (tags === null) return;
  await sql(`UPDATE people SET tags = $2 WHERE id = $1`, [personId, tags]);
}
