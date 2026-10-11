// 参議院選挙 議席計算（2026-10-11）
// 選挙区=各45区で上位N人（フル定数） / 比例=全国100議席・サン＝ラグ方式・非拘束名簿（党内は得票順）

import { SANGIIN_DISTRICTS, SANGIIN_PROPORTIONAL_SEATS } from "@/data/sangiin";

export type SangiinEntryRow = {
  person_id: string;
  district_id: string;
  seat_type: string; // "district" | "proportional"
  party_id: string;
  list_rank: number;
  score: number;
  likes: number;
  dislikes: number;
  name?: string;
  avatar_url?: string | null;
};

export type SangiinDistrictRace = {
  districtId: string;
  seats: number;
  candidates: SangiinEntryRow[]; // 得票降順
  winners: SangiinEntryRow[];
};

export type SangiinOutcome = {
  districtRaces: Map<string, SangiinDistrictRace>;
  proportional: {
    partyTotals: Record<string, number>;
    partySeats: Record<string, number>;
    elected: { person_id: string; party_id: string }[];
  };
  /** 党別の総議席（区+比例） */
  partySeatsTotal: Record<string, number>;
  totalElected: number;
};

const cmp = (a: SangiinEntryRow, b: SangiinEntryRow) =>
  b.score - a.score || a.person_id.localeCompare(b.person_id);

/** サン＝ラグ式: 除数 1,3,5,... の商で上位 seats を配分（小党に有利・より比例代表的） */
export function sainteLague(totals: Record<string, number>, seats: number): Record<string, number> {
  const out: Record<string, number> = {};
  const quotients: { q: number; p: string }[] = [];
  for (const [p, v] of Object.entries(totals)) {
    if (v <= 0) continue;
    for (let i = 1; i <= seats; i++) quotients.push({ q: v / (2 * i - 1), p });
  }
  quotients.sort((a, b) => b.q - a.q || a.p.localeCompare(b.p));
  for (const { p } of quotients.slice(0, seats)) out[p] = (out[p] ?? 0) + 1;
  return out;
}

export function computeSangiin(entries: SangiinEntryRow[]): SangiinOutcome {
  const districtRaces = new Map<string, SangiinDistrictRace>();
  for (const d of SANGIIN_DISTRICTS) {
    const candidates = entries.filter((e) => e.seat_type === "district" && e.district_id === d.id).sort(cmp);
    districtRaces.set(d.id, {
      districtId: d.id,
      seats: d.seats,
      candidates,
      winners: candidates.slice(0, d.seats),
    });
  }

  // 比例: 党得票 = 比例候補者の得票合計 → サン=ラグ100議席 → 党内は得票順
  const partyTotals: Record<string, number> = {};
  const propByParty = new Map<string, SangiinEntryRow[]>();
  for (const e of entries) {
    if (e.seat_type !== "proportional") continue;
    partyTotals[e.party_id] = (partyTotals[e.party_id] ?? 0) + e.score;
    const arr = propByParty.get(e.party_id) ?? [];
    arr.push(e);
    propByParty.set(e.party_id, arr);
  }
  const partySeats = sainteLague(partyTotals, SANGIIN_PROPORTIONAL_SEATS);
  const elected: { person_id: string; party_id: string }[] = [];
  for (const [party, n] of Object.entries(partySeats)) {
    const list = (propByParty.get(party) ?? []).sort(cmp);
    for (let i = 0; i < n && i < list.length; i++) {
      elected.push({ person_id: list[i].person_id, party_id: party });
    }
  }

  const partySeatsTotal: Record<string, number> = {};
  for (const race of districtRaces.values()) {
    for (const w of race.winners) {
      partySeatsTotal[w.party_id] = (partySeatsTotal[w.party_id] ?? 0) + 1;
    }
  }
  for (const [p, n] of Object.entries(partySeats)) {
    partySeatsTotal[p] = (partySeatsTotal[p] ?? 0) + n;
  }

  return {
    districtRaces,
    proportional: { partyTotals, partySeats, elected },
    partySeatsTotal,
    totalElected: Object.values(partySeatsTotal).reduce((a, b) => a + b, 0),
  };
}
