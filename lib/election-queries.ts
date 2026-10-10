// ツイッタラー衆院選 クエリ（2026-10-10）
import { sql } from "@/lib/db";
import { ELECTION } from "@/lib/constants";
import { allDistricts } from "@/data/election";
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
         COALESCE(s.score, 0)::float AS score, COALESCE(s.likes, 0)::int AS likes, COALESCE(s.dislikes, 0)::int AS dislikes,
         p.name, p.avatar_url
  FROM election_entries e
  JOIN people p ON p.id = e.person_id AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
  LEFT JOIN ${SCORE_SUB} ON s.person_id = e.person_id`;

/** 全エントリ（得票付き・約8.5千行）— メインページ用 */
export async function getElectionEntriesWithScores(): Promise<EntryWithName[]> {
  return sql<EntryWithName>(`${BASE_SELECT} ORDER BY e.person_id`, [
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

/** 新規人物の選挙割り当て（最少人数の区・最少人数の党・名簿末尾に追加）— 2026-10-10 */
export async function assignElectionEntry(personId: string): Promise<void> {
  try {
    const exists = await sql(`SELECT 1 FROM election_entries WHERE person_id = $1`, [personId]);
    if (exists.length > 0) return;
    const d = await sql<{ district_id: string }>(
      `SELECT district_id FROM election_entries GROUP BY district_id ORDER BY count(*) ASC, district_id ASC LIMIT 1`
    );
    const pt = await sql<{ party_id: string }>(
      `SELECT party_id FROM election_entries GROUP BY party_id ORDER BY count(*) ASC, party_id ASC LIMIT 1`
    );
    if (d.length === 0 || pt.length === 0) return;
    const districtId = d[0].district_id;
    const blockId = allDistricts().find((x) => x.name === districtId)?.blockId ?? "tokyo";
    const partyId = pt[0].party_id;
    await sql(
      `INSERT INTO election_entries (person_id, district_id, block_id, party_id, list_rank)
       SELECT $1, $2, $3, $4, COALESCE(MAX(list_rank), 0) + 1
       FROM election_entries WHERE party_id = $4 AND block_id = $3
       ON CONFLICT (person_id) DO NOTHING`,
      [personId, districtId, blockId, partyId]
    );
  } catch {
    /* 選挙テーブル未作成等は無視（投票機能には影響させない） */
  }
}

/** 参加統計（期間中の投票者・得票者・総票数） */
export async function getElectionStats(): Promise<{
  voters: number;
  votedPeople: number;
  totalVotes: number;
  totalCandidates: number;
}> {
  const r = await sql<{ voters: number; voted_people: number; total_votes: number; total_candidates: number }>(
    `SELECT
       (SELECT count(DISTINCT cookie_id) FROM votes WHERE created_at >= $1 AND created_at <= $2)::int AS voters,
       (SELECT count(DISTINCT person_id) FROM votes WHERE created_at >= $1 AND created_at <= $2)::int AS voted_people,
       (SELECT count(*) FROM votes WHERE created_at >= $1 AND created_at <= $2)::int AS total_votes,
       (SELECT count(*) FROM election_entries)::int AS total_candidates`,
    [ELECTION.startIso, ELECTION.endIso]
  );
  const x = r[0] ?? { voters: 0, voted_people: 0, total_votes: 0, total_candidates: 0 };
  return {
    voters: x.voters,
    votedPeople: x.voted_people,
    totalVotes: x.total_votes,
    totalCandidates: x.total_candidates,
  };
}

/** 党勢推移（スナップショット） */
export async function getElectionTrend(): Promise<
  { day: string; hour: number; party_id: string; seats: number }[]
> {
  return await sql<{ day: string; hour: number; party_id: string; seats: number }>(
    `SELECT day, hour, party_id, seats FROM election_snapshots ORDER BY day, hour`
  );
}
