// 参院選クエリ（2026-10-11）— 衆院と同じ投票スコアを参照（同時選挙）
import { sql } from "@/lib/db";
import { ELECTION } from "@/lib/constants";
import type { SangiinEntryRow } from "@/lib/sangiin";

const SCORE_SUB = `(
  SELECT person_id,
         SUM(CASE vote_type WHEN 'like' THEN 1 ELSE -0.5 END)::float AS score,
         COUNT(*) FILTER (WHERE vote_type = 'like') AS likes,
         COUNT(*) FILTER (WHERE vote_type = 'dislike') AS dislikes
  FROM votes WHERE created_at >= $1 AND created_at <= $2
  GROUP BY person_id
) s`;

export type SangiinEntryWithName = SangiinEntryRow & { name: string; avatar_url: string | null };

/** 参院全エントリ（得票付き） */
export async function getSangiinEntriesWithScores(): Promise<SangiinEntryWithName[]> {
  return sql<SangiinEntryWithName>(
    `SELECT g.person_id, g.district_id, g.seat_type, g.party_id, g.list_rank,
            COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes,
            p.name, p.avatar_url
     FROM sangiin_entries g
     JOIN people p ON p.id = g.person_id AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     LEFT JOIN ${SCORE_SUB} ON s.person_id = g.person_id
     ORDER BY g.person_id`,
    [ELECTION.startIso, ELECTION.endIso]
  );
}

/** 選挙区単位（得票降順） */
export async function getSangiinEntriesByDistrict(districtId: string): Promise<SangiinEntryWithName[]> {
  return sql<SangiinEntryWithName>(
    `SELECT g.person_id, g.district_id, g.seat_type, g.party_id, g.list_rank,
            COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes,
            p.name, p.avatar_url
     FROM sangiin_entries g
     JOIN people p ON p.id = g.person_id AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     LEFT JOIN ${SCORE_SUB} ON s.person_id = g.person_id
     WHERE g.district_id = $3 AND g.seat_type = 'district'
     ORDER BY COALESCE(s.score, 0) DESC, g.person_id ASC`,
    [ELECTION.startIso, ELECTION.endIso, districtId]
  );
}

export type PersonSangiinElection = {
  district_id: string;
  seat_type: string;
  party_id: string;
  list_rank: number;
  score: number;
  likes: number;
  dislikes: number;
  rank: number;
  total: number;
};

/** 人物ページ用: その人の参院エントリ（順位付き） */
export async function getPersonSangiinElection(personId: string): Promise<PersonSangiinElection | null> {
  const entry = await sql<{ district_id: string; seat_type: string; party_id: string; list_rank: number }>(
    `SELECT district_id, seat_type, party_id, list_rank FROM sangiin_entries WHERE person_id = $1`,
    [personId]
  );
  if (entry.length === 0) return null;
  const e = entry[0];
  if (e.seat_type === "district") {
    const cands = await getSangiinEntriesByDistrict(e.district_id);
    const idx = cands.findIndex((c) => c.person_id === personId);
    if (idx < 0) return null;
    const me = cands[idx];
    return { ...e, score: me.score, likes: me.likes, dislikes: me.dislikes, rank: idx + 1, total: cands.length };
  }
  const rows = await sql<{ person_id: string; score: number; likes: number; dislikes: number }>(
    `SELECT g.person_id, COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes
     FROM sangiin_entries g
     LEFT JOIN ${SCORE_SUB} ON s.person_id = g.person_id
     WHERE g.seat_type = 'proportional' AND g.party_id = $3
     ORDER BY COALESCE(s.score, 0) DESC, g.person_id ASC`,
    [ELECTION.startIso, ELECTION.endIso, e.party_id]
  );
  const idx = rows.findIndex((r) => r.person_id === personId);
  if (idx < 0) return null;
  const me = rows[idx];
  return { ...e, score: me.score, likes: me.likes, dislikes: me.dislikes, rank: idx + 1, total: rows.length };
}
