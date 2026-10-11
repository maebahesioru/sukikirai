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

/** プロフから都道府県を検出（プロフ・リンク欄の記載→確定配属に使用）— 2026-10-11 */
const PREF_CITIES: Record<string, string> = {
  札幌: "北海道", 仙台: "宮城", さいたま: "埼玉", 横浜: "神奈川", 川崎: "神奈川", 相模原: "神奈川",
  名古屋: "愛知", 堺: "大阪", 神戸: "兵庫", 北九州: "福岡", 那覇: "沖縄", 金沢: "石川", 大津: "滋賀",
  高松: "香川", 松山: "愛媛", 長崎: "長崎", 大分: "大分", 宮崎: "宮崎", 鹿児島: "鹿児島", 松江: "島根",
  鳥取: "鳥取", 山口: "山口", 徳島: "徳島", 奈良: "奈良", 和歌山: "和歌山", 甲府: "山梨", 富山: "富山",
  福井: "福井", 岐阜: "岐阜", 長野: "長野", 水戸: "茨城", 宇都宮: "栃木", 前橋: "群馬", 盛岡: "岩手",
  秋田: "秋田", 山形: "山形", 福島: "福島", 青森: "青森", 静岡: "静岡", 浜松: "静岡", 新潟: "新潟",
  熊本: "熊本", 広島: "広島", 岡山: "岡山", 大阪: "大阪",
};
const PREF_NAMES =
  "北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄".split("|");
/** 政党・思想ワード→党（優先順） */
const PARTY_RULES: [string, string[]][] = [
  ["kyosan", ["共産", "マルクス"]],
  ["shakai", ["社民", "社会民主"]],
  ["minshu", ["立憲", "リベラル", "左翼", "パヨク"]],
  ["kaikaku", ["維新"]],
  ["kokumin", ["国民民主"]],
  ["hoshu", ["自民", "保守", "右翼", "ネトウヨ", "参政", "反動"]],
  ["heiwa", ["反戦", "平和主義", "護憲"]],
  ["jiyuu", ["リバタリアン", "自由主義"]],
];

export function detectPref(text: string): string | null {
  for (const [c, p] of Object.entries(PREF_CITIES)) if (text.includes(c)) return p;
  for (const p of PREF_NAMES) if (text.includes(p)) return p;
  return null;
}

export function detectParty(text: string): string | null {
  for (const [pid, kws] of PARTY_RULES) for (const kw of kws) if (text.includes(kw)) return pid;
  return null;
}

/** 新規人物の選挙割り当て（プロフの都道府県/政党記載を優先・なければ最少人数の区/党・名簿末尾に追加）— 2026-10-11更新 */
export async function assignElectionEntry(personId: string): Promise<void> {
  try {
    const exists = await sql(`SELECT 1 FROM election_entries WHERE person_id = $1`, [personId]);
    if (exists.length > 0) return;
    // プロフ・リンク欄から確定配属を試みる
    const pr = await sql<{ text: string }>(
      `SELECT COALESCE(x_description,'') || ' ' || COALESCE(description,'') || ' ' || COALESCE(x_website,'') AS text FROM people WHERE id = $1`,
      [personId]
    );
    const text = pr[0]?.text ?? "";
    const pref = detectPref(text);
    const party = detectParty(text);
    let districtId: string | null = null;
    if (pref) {
      const pd = await sql<{ district_id: string }>(
        `SELECT district_id FROM election_entries WHERE district_id LIKE $1 GROUP BY district_id ORDER BY count(*) ASC, district_id ASC LIMIT 1`,
        [`${pref}%`]
      );
      districtId = pd[0]?.district_id ?? null;
    }
    if (!districtId) {
      const d = await sql<{ district_id: string }>(
        `SELECT district_id FROM election_entries GROUP BY district_id ORDER BY count(*) ASC, district_id ASC LIMIT 1`
      );
      districtId = d[0]?.district_id ?? null;
    }
    const pt = party
      ? [{ party_id: party }]
      : await sql<{ party_id: string }>(
          `SELECT party_id FROM election_entries GROUP BY party_id ORDER BY count(*) ASC, party_id ASC LIMIT 1`
        );
    if (!districtId || pt.length === 0) return;
    const blockId = allDistricts().find((x) => x.name === districtId)?.blockId ?? "tokyo";
    await sql(
      `INSERT INTO election_entries (person_id, district_id, block_id, party_id, list_rank)
       SELECT $1, $2, $3, $4, COALESCE(MAX(list_rank), 0) + 1
       FROM election_entries WHERE party_id = $4 AND block_id = $3
       ON CONFLICT (person_id) DO NOTHING`,
      [personId, districtId, blockId, pt[0].party_id]
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
