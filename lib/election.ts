// ツイッタラー衆院選 議席計算（2026-10-10）
// 小選挙区=スコア1位 / 比例=党のブロック得票でドント式→党内名簿順（比例復活あり）

import { BLOCKS } from "@/data/election";

export type ElectionEntryRow = {
  person_id: string;
  district_id: string;
  block_id: string;
  party_id: string;
  list_rank: number;
  score: number;
  likes: number;
  dislikes: number;
  /** 表示用（getElectionEntriesWithScores 等では常に付与される） */
  name?: string;
  avatar_url?: string | null;
};

export type DistrictRace = {
  districtId: string;
  blockId: string;
  candidates: ElectionEntryRow[]; // スコア降順
  winner: ElectionEntryRow | null;
};

export type BlockOutcome = {
  blockId: string;
  seats: number;
  partyTotals: Record<string, number>;
  partySeats: Record<string, number>;
  /** 比例当選（党→名簿順・小選挙区当選者は除外） */
  proportional: { person_id: string; party_id: string; list_rank: number }[];
};

export type ElectionOutcome = {
  districtRaces: Map<string, DistrictRace>;
  /** 小選挙区当選者 person_id → 選挙区 */
  districtWinners: Map<string, string>;
  blocks: Map<string, BlockOutcome>;
  /** 党別議席（小選挙区+比例） */
  partySeats: Record<string, number>;
  /** 全当選者 */
  elected: { person_id: string; party_id: string; via: "district" | "proportional"; district_id: string }[];
};

const cmp = (a: ElectionEntryRow, b: ElectionEntryRow) =>
  b.score - a.score || a.person_id.localeCompare(b.person_id);

/** 惜敗率（小選挙区の勝者得票に対する比率）— 比例復活の10%要件に使用（2026-10-11） */
function defeatRatio(e: ElectionEntryRow, winnerScore: number): number {
  if (winnerScore <= 0) return 1;
  return Math.max(0, e.score) / winnerScore;
}

/** ドント式: 各党の得票から seats 議席を配分 */
export function dhondt(totals: Record<string, number>, seats: number): Record<string, number> {
  const out: Record<string, number> = {};
  const parties = Object.entries(totals).filter(([, v]) => v > 0);
  if (parties.length === 0 || seats <= 0) return out;
  const quotients: { p: string; q: number }[] = [];
  for (const [p, v] of parties) {
    for (let d = 1; d <= seats; d++) quotients.push({ p, q: v / d });
  }
  quotients.sort((a, b) => b.q - a.q || a.p.localeCompare(b.p));
  for (let i = 0; i < seats && i < quotients.length; i++) {
    out[quotients[i].p] = (out[quotients[i].p] ?? 0) + 1;
  }
  return out;
}

export function computeElection(entries: ElectionEntryRow[]): ElectionOutcome {
  // --- 小選挙区 ---
  const byDistrict = new Map<string, ElectionEntryRow[]>();
  for (const e of entries) {
    const arr = byDistrict.get(e.district_id);
    if (arr) arr.push(e);
    else byDistrict.set(e.district_id, [e]);
  }
  const districtRaces = new Map<string, DistrictRace>();
  const districtWinners = new Map<string, string>();
  for (const [districtId, list] of byDistrict) {
    const sorted = [...list].sort(cmp);
    districtRaces.set(districtId, { districtId, blockId: sorted[0].block_id, candidates: sorted, winner: sorted[0] ?? null });
    if (sorted[0]) districtWinners.set(sorted[0].person_id, districtId);
  }

  // --- 比例 ---
  const blocks = new Map<string, BlockOutcome>();
  for (const b of BLOCKS) {
    const partyTotals: Record<string, number> = {};
    for (const e of entries) {
      if (e.block_id !== b.id) continue;
      partyTotals[e.party_id] = (partyTotals[e.party_id] ?? 0) + e.score;
    }
    const partySeats = dhondt(partyTotals, b.seats);
    const proportional: BlockOutcome["proportional"] = [];
    for (const [partyId, n] of Object.entries(partySeats)) {
      const list = entries
        .filter((e) => e.block_id === b.id && e.party_id === partyId && !districtWinners.has(e.person_id))
        .sort((a, b2) => a.list_rank - b2.list_rank);
      let filled = 0;
      for (const e of list) {
        if (filled >= n) break;
        // 比例復活には惜敗率10%以上が必要（現実のルール・2026-10-11）
        const wScore = districtRaces.get(e.district_id)?.winner?.score ?? 0;
        if (defeatRatio(e, wScore) < 0.1) continue;
        proportional.push({ person_id: e.person_id, party_id: partyId, list_rank: e.list_rank });
        filled++;
      }
    }
    blocks.set(b.id, { blockId: b.id, seats: b.seats, partyTotals, partySeats, proportional });
  }

  // --- 集計 ---
  const partySeats: Record<string, number> = {};
  const elected: ElectionOutcome["elected"] = [];
  for (const [personId, districtId] of districtWinners) {
    const e = entries.find((x) => x.person_id === personId);
    if (!e) continue;
    partySeats[e.party_id] = (partySeats[e.party_id] ?? 0) + 1;
    elected.push({ person_id: personId, party_id: e.party_id, via: "district", district_id: districtId });
  }
  for (const br of blocks.values()) {
    for (const w of br.proportional) {
      const e = entries.find((x) => x.person_id === w.person_id);
      partySeats[w.party_id] = (partySeats[w.party_id] ?? 0) + 1;
      elected.push({ person_id: w.person_id, party_id: w.party_id, via: "proportional", district_id: e?.district_id ?? "" });
    }
  }

  return { districtRaces, districtWinners, blocks, partySeats, elected };
}
