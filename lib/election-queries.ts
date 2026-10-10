// ツイッタラー衆院選 クエリ（2026-10-10）
import { sql } from "@/lib/db";
import { ELECTION } from "@/lib/constants";
import type { ElectionEntryRow } from "@/lib/election";

const SCORE_SUB = `(
  SELECT person_id,
         SUM(CASE vote_type WHEN 'like' THEN 1 ELSE -0.5 END)::float AS score,
         COUNT(*) FILTER (WHERE vote_type = 'like') AS likes,
         COUNT(*) FILTER (WHERE vote_type = 'dislike') AS dislikes
  FROM votes WHERE created_at >= $1 AND created_at <= $2
  GROUP BY person_id
) s`;

const BASE_SELECT = `SELECT e.person_id, e.district_id, e.block_id, e.party_id, e.list_rank,
         COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes
  FROM election_entries e
  JOIN people p ON p.id = e.person_id AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
  LEFT JOIN ${SCORE_SUB} ON s.person_id = e.person_id`;

/** 全エントリ（得票付き・約8.5千行）— メインページ用 */
export async function getElectionEntriesWithScores(): Promise<ElectionEntryRow[]> {
  return sql<ElectionEntryRow>(`${BASE_SELECT} ORDER BY e.person_id`, [
    ELECTION.startIso,
    ELECTION.endIso,
  ]);
}

export type EntryWithName = ElectionEntryRow & { name: string; avatar_url: string | null };

/** ブロック単位のエントリ（名前付き） */
export async function getElectionEntriesByBlock(blockId: string): Promise<EntryWithName[]> {
  return sql<EntryWithName>(
    `SELECT e.person_id, e.district_id, e.block_id, e.party_id, e.list_rank,
            COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes,
            p.name, p.avatar_url
     FROM election_entries e
     JOIN people p ON p.id = e.person_id AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     LEFT JOIN ${SCORE_SUB} ON s.person_id = e.person_id
     WHERE e.block_id = $3 ORDER BY e.person_id`,
    [ELECTION.startIso, ELECTION.endIso, blockId]
  );
}

export type DistrictCandidate = ElectionEntryRow & { name: string; avatar_url: string | null };

/** 選挙区の候補者一覧（得票降順） */
export async function getElectionEntriesByDistrict(
  districtId: string
): Promise<DistrictCandidate[]> {
  return sql<DistrictCandidate>(
    `SELECT e.person_id, e.district_id, e.block_id, e.party_id, e.list_rank,
            COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes,
            p.name, p.avatar_url
     FROM election_entries e
     JOIN people p ON p.id = e.person_id AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     LEFT JOIN ${SCORE_SUB} ON s.person_id = e.person_id
     WHERE e.district_id = $3
     ORDER BY COALESCE(s.score, 0)::float DESC, e.person_id ASC`,
    [ELECTION.startIso, ELECTION.endIso, districtId]
  );
}

export type PersonElection = {
  district_id: string;
  block_id: string;
  party_id: string;
  list_rank: number;
  score: number;
  likes: number;
  dislikes: number;
  rank: number;
  total: number;
};

/** 人物ページ用: 選挙区・党・現在順位 */
export async function getPersonElection(personId: string): Promise<PersonElection | null> {
  const rows = await getElectionEntriesByDistrictForPerson(personId);
  if (!rows) return null;
  return rows;
}

async function getElectionEntriesByDistrictForPerson(
  personId: string
): Promise<PersonElection | null> {
  const entry = await sql<{ district_id: string; block_id: string; party_id: string; list_rank: number }>(
    `SELECT district_id, block_id, party_id, list_rank FROM election_entries WHERE person_id = $1`,
    [personId]
  );
  if (entry.length === 0) return null;
  const e = entry[0];
  const cands = await getElectionEntriesByDistrict(e.district_id);
  const idx = cands.findIndex((c) => c.person_id === personId);
  if (idx < 0) return null;
  const me = cands[idx];
  return {
    district_id: e.district_id,
    block_id: e.block_id,
    party_id: e.party_id,
    list_rank: e.list_rank,
    score: me.score,
    likes: me.likes,
    dislikes: me.dislikes,
    rank: idx + 1,
    total: cands.length,
  };
}
