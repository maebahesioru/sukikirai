import { sql, sql1 } from "./db";
import {
  SQUID,
  stageOfDay,
  dayRange,
  dayStartMs,
  squidDay,
  sortRank,
  cutBoundary,
  type RankRow,
} from "./squid";

/* ------------------------------------------------------------------ *
 * テーブル（db/schema.sql と同じ。未適用環境でも動くようここでも作る）
 * ------------------------------------------------------------------ */
const DDL = [
  "CREATE TABLE IF NOT EXISTS squid_scores (day INTEGER NOT NULL, person_id TEXT NOT NULL, raw_pts REAL NOT NULL DEFAULT 0, pts REAL NOT NULL DEFAULT 0, vote_pts REAL NOT NULL DEFAULT 0, eval_pts REAL NOT NULL DEFAULT 0, comment_pts REAL NOT NULL DEFAULT 0, vote_count INTEGER NOT NULL DEFAULT 0, vote_likes INTEGER NOT NULL DEFAULT 0, eval_count INTEGER NOT NULL DEFAULT 0, comment_count INTEGER NOT NULL DEFAULT 0, last_action_at TIMESTAMPTZ, PRIMARY KEY (day, person_id))",
  "CREATE INDEX IF NOT EXISTS idx_squid_scores_person ON squid_scores(person_id)",
  "CREATE TABLE IF NOT EXISTS squid_participants (person_id TEXT PRIMARY KEY, cum_pts REAL NOT NULL DEFAULT 0, eliminated_day INTEGER, eliminated_round TEXT, last_day INTEGER, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  "CREATE INDEX IF NOT EXISTS idx_squid_participants_alive ON squid_participants(eliminated_day, cum_pts DESC)",
  "CREATE TABLE IF NOT EXISTS squid_days (day INTEGER PRIMARY KEY, stage_slug TEXT NOT NULL, alive_before INTEGER NOT NULL DEFAULT 0, cutline_pts REAL, eliminated INTEGER NOT NULL DEFAULT 0, alive_after INTEGER NOT NULL DEFAULT 0, computed_at TIMESTAMPTZ NOT NULL DEFAULT now())",
  "CREATE TABLE IF NOT EXISTS squid_rounds (slot INTEGER PRIMARY KEY, round_at TIMESTAMPTZ NOT NULL, alive_before INTEGER NOT NULL, eliminated INTEGER NOT NULL, alive_after INTEGER NOT NULL, computed_at TIMESTAMPTZ NOT NULL DEFAULT now())",
];

let ensuredPromise: Promise<void> | null = null;
export function ensureSquidTables(): Promise<void> {
  if (!ensuredPromise) {
    ensuredPromise = (async () => {
      for (const stmt of DDL) await sql(stmt);
    })().catch((e) => {
      ensuredPromise = null;
      throw e;
    });
  }
  return ensuredPromise;
}

/* ------------------------------------------------------------------ *
 * 日次ポイントの集計（既存 SCORE_SUB と同じ重み付け・リング除外）
 * ------------------------------------------------------------------ */
export type RawRow = {
  person_id: string;
  raw_pts: number;
  vote_pts: number;
  eval_pts: number;
  comment_pts: number;
  vote_count: number;
  vote_likes: number;
  eval_count: number;
  comment_count: number;
  last_action_at: Date | null;
};

const RAW_SQL = `
WITH v AS (
  SELECT v.person_id,
         SUM(CASE v.vote_type WHEN 'like' THEN 1.0 ELSE -0.5 END)::real AS pts,
         COUNT(*)::int AS n,
         COUNT(*) FILTER (WHERE v.vote_type = 'like')::int AS likes,
         MAX(v.created_at) AS last_at
  FROM votes v
  WHERE v.created_at >= $1::timestamptz AND v.created_at < $2::timestamptz
    AND NOT EXISTS (SELECT 1 FROM vote_ring_excluded r WHERE r.cookie_id = v.cookie_id)
  GROUP BY v.person_id
), c AS (
  SELECT q.person_id,
         SUM(CASE q.vote_type WHEN 'like' THEN 2.0 ELSE -1.5 END)::real AS pts,
         COUNT(*)::int AS n,
         MAX(q.created_at) AS last_at
  FROM (
    SELECT DISTINCT ON (c.person_id, c.cookie_id)
           c.person_id, c.cookie_id, c.vote_type, c.created_at, c.content
    FROM comments c
    WHERE c.created_at >= $1::timestamptz AND c.created_at < $2::timestamptz
      AND NOT c.is_hidden AND char_length(btrim(c.content)) > 4
    ORDER BY c.person_id, c.cookie_id, c.created_at ASC
  ) q
  WHERE (SELECT count(*) FROM comments c2
         WHERE c2.person_id = q.person_id
           AND c2.created_at >= $1::timestamptz AND c2.created_at < $2::timestamptz
           AND NOT c2.is_hidden AND btrim(c2.content) = btrim(q.content)) < 10
  GROUP BY q.person_id
), e AS (
  SELECT e.person_id,
         SUM(CASE WHEN (e.fun + e.accuracy + e.influence + e.knowledge + e.humanity + e.charisma + e.favor + e.reply) >= 20 THEN 1.5 ELSE -1.0 END)::real AS pts,
         COUNT(*)::int AS n,
         MAX(e.created_at) AS last_at
  FROM evaluations e
  WHERE e.created_at >= $1::timestamptz AND e.created_at < $2::timestamptz
  GROUP BY e.person_id
)
SELECT person_id,
       SUM(pts)::real AS raw_pts,
       SUM(vote_pts)::real AS vote_pts,
       SUM(eval_pts)::real AS eval_pts,
       SUM(comment_pts)::real AS comment_pts,
       SUM(vote_count)::int AS vote_count,
       SUM(vote_likes)::int AS vote_likes,
       SUM(eval_count)::int AS eval_count,
       SUM(comment_count)::int AS comment_count,
       MAX(last_at) AS last_action_at
FROM (
  SELECT person_id, pts, pts AS vote_pts, 0::real AS eval_pts, 0::real AS comment_pts,
         n AS vote_count, likes AS vote_likes, 0 AS eval_count, 0 AS comment_count, last_at
  FROM v
  UNION ALL
  SELECT person_id, pts, 0::real, 0::real, pts,
         0, 0, 0, n, last_at
  FROM c
  UNION ALL
  SELECT person_id, pts, 0::real, pts, 0::real,
         0, 0, n, 0, last_at
  FROM e
) x
GROUP BY person_id
`;

export async function aggregateRaw(startIso: string, endIso: string): Promise<RawRow[]> {
  return sql<RawRow>(RAW_SQL, [startIso, endIso]);
}

/* ------------------------------------------------------------------ *
 * 内部の作業構造
 * ------------------------------------------------------------------ */
type DayCell = { i: number; raw: number; pts: number; row: RawRow };

export type SquidTickResult = {
  day: number;
  settledDay: number;
  alive: number;
  total: number;
  recomputed: boolean;
};

/* ------------------------------------------------------------------ *
 * 毎日 0:00 の判定（本体）
 * ------------------------------------------------------------------ */
export async function runSquidTick(now: Date = new Date(), force = false): Promise<SquidTickResult> {
  await ensureSquidTables();

  const day = squidDay(now);
  const maxDaily = Math.min(Math.max(day - 1, 0), 25);
  const totals = await sql1<{ n: number }>("SELECT COUNT(*)::int AS n FROM squid_participants");
  const lastRow = await sql1<{ d: number | null }>("SELECT MAX(day)::int AS d FROM squid_days");
  const lastDay = lastRow?.d ?? 0;
  const need = force || !totals || totals.n === 0 || lastDay < maxDaily;

  if (need) await fullRecompute(maxDaily);

  const aliveRow = await sql1<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM squid_participants WHERE eliminated_day IS NULL"
  );
  const totalRow = await sql1<{ n: number }>("SELECT COUNT(*)::int AS n FROM squid_participants");
  return {
    day,
    settledDay: maxDaily,
    alive: aliveRow?.n ?? 0,
    total: totalRow?.n ?? 0,
    recomputed: need,
  };
}

async function fullRecompute(maxDaily: number): Promise<void> {
  const people = await sql<{ id: string }>("SELECT id FROM people WHERE NOT is_hidden");
  const n = people.length;
  if (n === 0) return;
  const index = new Map<string, number>();
  people.forEach((p, i) => index.set(p.id, i));

  // 1日目〜maxDaily の生データ
  const cells: DayCell[][] = [];
  for (let d = 1; d <= maxDaily; d++) {
    const { startIso, endIso } = dayRange(d);
    const rows = await aggregateRaw(startIso, endIso);
    const list: DayCell[] = [];
    for (const row of rows) {
      const i = index.get(row.person_id);
      if (i === undefined) continue;
      list.push({ i, raw: row.raw_pts, pts: row.raw_pts, row });
    }
    cells[d] = list;
  }

  const cum = new Float64Array(n);
  const lastMs = new Float64Array(n);
  const lastDay = new Int32Array(n);

  const addDay = (d: number) => {
    const list = cells[d] ?? [];
    for (const c of list) {
      cum[c.i] += c.pts;
      lastDay[c.i] = d;
      const ms = c.row.last_action_at ? new Date(c.row.last_action_at).getTime() : 0;
      if (ms > lastMs[c.i]) lastMs[c.i] = ms;
    }
  };

  const cumThrough = (lastD: number) => {
    const snap = new Float64Array(n);
    for (let d = 1; d <= lastD; d++) {
      for (const c of cells[d] ?? []) snap[c.i] += c.pts;
    }
    return snap;
  };

  /* --- ステージ1: だるまさんが転んだ（1-5, そのまま） --- */
  /* --- ステージ2: 綱引き（6-9, ±10pt クリップ） --- */
  for (let d = 6; d <= 9; d++) {
    for (const c of cells[d] ?? []) c.pts = Math.max(-10, Math.min(10, c.raw));
  }
  const cumAt9 = cumThrough(9);

  /* --- ステージ3: ビー玉（10-13, 累積順位が隣どうしのペア合計10pt） --- */
  {
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => cumAt9[b] - cumAt9[a]);
    const partner = new Int32Array(n).fill(-1);
    for (let k = 0; k + 1 < order.length; k += 2) {
      partner[order[k]] = order[k + 1];
      partner[order[k + 1]] = order[k];
    }
    const stagePts = new Float64Array(n);
    for (let d = 10; d <= 13; d++) for (const c of cells[d] ?? []) stagePts[c.i] += c.raw;
    for (let d = 10; d <= 13; d++) {
      for (const c of cells[d] ?? []) {
        const pt = partner[c.i];
        if (pt < 0) { c.pts = c.raw; continue; }
        const pairTotal = stagePts[c.i] + stagePts[pt];
        c.pts = pairTotal >= 10 || stagePts[c.i] >= 5 ? c.raw : 0;
      }
    }
  }
  const cumAt13 = cumThrough(13);

  /* --- ステージ4: めんこ（14-17, 被likeが近い者どうしのペアで勝敗） --- */
  {
    const likeTotal = new Float64Array(n);
    for (let d = 1; d <= 13; d++) for (const c of cells[d] ?? []) likeTotal[c.i] += c.row.vote_likes;
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => likeTotal[b] - likeTotal[a]);
    const partner = new Int32Array(n).fill(-1);
    for (let k = 0; k + 1 < order.length; k += 2) {
      partner[order[k]] = order[k + 1];
      partner[order[k + 1]] = order[k];
    }
    const stagePts = new Float64Array(n);
    for (let d = 14; d <= 17; d++) for (const c of cells[d] ?? []) stagePts[c.i] += c.raw;
    for (let d = 14; d <= 17; d++) {
      for (const c of cells[d] ?? []) {
        const pt = partner[c.i];
        if (pt < 0) { c.pts = c.raw; continue; }
        c.pts = stagePts[c.i] >= stagePts[pt] ? c.raw : 0;
      }
    }
    void cumAt13;
  }
  const cumAt17 = cumThrough(17);
  void cumAt17;
  void cumAt17;

  /* --- ステージ5: 近代五種（18-21, 5種目の順位点を最終日にまとめて加算） --- */
  {
    const metrics: Float64Array[] = [];
    const votes = new Float64Array(n);
    const evals = new Float64Array(n);
    const cmts = new Float64Array(n);
    const likes = new Float64Array(n);
    const days = new Float64Array(n);
    for (let d = 18; d <= 21; d++) {
      for (const c of cells[d] ?? []) {
        votes[c.i] += c.row.vote_count;
        evals[c.i] += c.row.eval_count;
        cmts[c.i] += c.row.comment_count;
        likes[c.i] += c.row.vote_likes;
        days[c.i] += 1;
      }
    }
    metrics.push(votes, evals, cmts, likes, days);
    const score = new Float64Array(n);
    for (let m = 0; m < metrics.length; m++) {
      const arr = metrics[m];
      const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[b] - arr[a]);
      for (let r = 0; r < order.length; r++) {
        const i = order[r];
        if (arr[i] <= 0) continue;
        let p = ((order.length - r) / order.length) * 10;
        if (m === 3) p = p * 0.5;
        score[i] += p;
      }
    }
    for (let d = 18; d <= 21; d++) {
      for (const c of cells[d] ?? []) c.pts = d === 21 ? score[c.i] : 0;
    }
  }

  /* --- ステージ7: 天空（26-29, 獲得点は0.5倍） --- */
  for (let d = 26; d <= 29; d++) {
    for (const c of cells[d] ?? []) c.pts = c.raw * 0.5;
  }

  /* --- 脱落のリプレイ（毎日 0:00 に累積下位24%） --- */
  const eliminatedDay = new Int32Array(n).fill(0);
  const eliminatedRound: string[] = new Array(n).fill("");
  const dayRows: {
    day: number;
    stage_slug: string;
    alive_before: number;
    cutline_pts: number | null;
    eliminated: number;
    alive_after: number;
  }[] = [];

  let aliveList: number[] = Array.from({ length: n }, (_, i) => i);
  const aliveSet = new Uint8Array(n).fill(1);

  const cut = (d: number) => {
    const rows: RankRow[] = aliveList.map((i) => ({
      personId: String(i),
      cum: cum[i],
      today: 0,
      lastMs: lastMs[i],
    }));
    const sorted = sortRank(rows);
    const { boundary, eliminate, cutline } = cutBoundary(sorted, SQUID.cutRate);
    const survivors: number[] = [];
    for (let k = 0; k < sorted.length; k++) {
      const i = Number(sorted[k].personId);
      if (k < boundary) survivors.push(i);
      else {
        aliveSet[i] = 0;
        eliminatedDay[i] = d;
        eliminatedRound[i] = "daily";
      }
    }
    dayRows.push({
      day: d,
      stage_slug: stageOfDay(d).slug,
      alive_before: sorted.length,
      cutline_pts: cutline,
      eliminated: eliminate,
      alive_after: survivors.length,
    });
    aliveList = survivors;
  };

  dayRows.push({
    day: 1,
    stage_slug: stageOfDay(1).slug,
    alive_before: n,
    cutline_pts: null,
    eliminated: 0,
    alive_after: n,
  });

  for (let d = 1; d <= maxDaily; d++) {
    if (d >= 2 && d <= 25) cut(d);
    addDay(d);
    // ステージ6: 大縄跳び（22-25, その日の達成率が60%未満なら下位30%の得点を0に）
    if (d >= 22 && d <= 25 && aliveList.length > 0) {
      const list = cells[d] ?? [];
      const dayPts = new Map<number, number>();
      for (const c of list) dayPts.set(c.i, c.pts);
      const movers = aliveList.filter((i) => (dayPts.get(i) ?? 0) !== 0).length;
      const rate = movers / aliveList.length;
      if (rate < 0.6) {
        const sortedDay = aliveList.slice().sort((a, b) => (dayPts.get(a) ?? 0) - (dayPts.get(b) ?? 0));
        const cutN = Math.floor(sortedDay.length * 0.3);
        const zero = new Set(sortedDay.slice(0, cutN));
        for (const c of list) {
          if (!zero.has(c.i)) continue;
          cum[c.i] -= c.pts;
          c.pts = 0;
        }
      }
    }
  }

  /* --- 書き戻し: squid_scores --- */
  for (let d = 1; d <= maxDaily; d++) {
    const list = cells[d] ?? [];
    const ids: string[] = [];
    const raw: number[] = [];
    const pts: number[] = [];
    const vp: number[] = [];
    const ep: number[] = [];
    const cp: number[] = [];
    const vc: number[] = [];
    const vl: number[] = [];
    const ec: number[] = [];
    const cc: number[] = [];
    const la: string[] = [];
    for (const c of list) {
      ids.push(people[c.i].id);
      raw.push(c.raw);
      pts.push(c.pts);
      vp.push(c.row.vote_pts);
      ep.push(c.row.eval_pts);
      cp.push(c.row.comment_pts);
      vc.push(c.row.vote_count);
      vl.push(c.row.vote_likes);
      ec.push(c.row.eval_count);
      cc.push(c.row.comment_count);
      la.push(c.row.last_action_at ? new Date(c.row.last_action_at).toISOString() : "");
    }
    await sql("DELETE FROM squid_scores WHERE day = $1", [d]);
    if (!ids.length) continue;
    await sql(
      "INSERT INTO squid_scores (day, person_id, raw_pts, pts, vote_pts, eval_pts, comment_pts, vote_count, vote_likes, eval_count, comment_count, last_action_at) " +
        "SELECT $1, u.person_id, u.raw_pts, u.pts, u.vote_pts, u.eval_pts, u.comment_pts, u.vote_count, u.vote_likes, u.eval_count, u.comment_count, NULLIF(u.last_at, '')::timestamptz " +
        "FROM unnest($2::text[], $3::real[], $4::real[], $5::real[], $6::real[], $7::real[], $8::int[], $9::int[], $10::int[], $11::int[], $12::text[]) AS u(person_id, raw_pts, pts, vote_pts, eval_pts, comment_pts, vote_count, vote_likes, eval_count, comment_count, last_at)",
      [d, ids, raw, pts, vp, ep, cp, vc, vl, ec, cc, la]
    );
  }

  /* --- 書き戻し: squid_days --- */
  for (const r of dayRows) {
    await sql(
      "INSERT INTO squid_days (day, stage_slug, alive_before, cutline_pts, eliminated, alive_after, computed_at) VALUES ($1,$2,$3,$4,$5,$6, now()) " +
        "ON CONFLICT (day) DO UPDATE SET stage_slug = EXCLUDED.stage_slug, alive_before = EXCLUDED.alive_before, cutline_pts = EXCLUDED.cutline_pts, eliminated = EXCLUDED.eliminated, alive_after = EXCLUDED.alive_after, computed_at = now()",
      [r.day, r.stage_slug, r.alive_before, r.cutline_pts, r.eliminated, r.alive_after]
    );
  }

  /* --- 書き戻し: squid_participants --- */
  const ids: string[] = [];
  const cums: number[] = [];
  const elimDays: (number | null)[] = [];
  const elimRounds: (string | null)[] = [];
  const lastDays: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    ids.push(people[i].id);
    cums.push(Math.round(cum[i] * 100) / 100);
    elimDays.push(eliminatedDay[i] > 0 ? eliminatedDay[i] : null);
    elimRounds.push(eliminatedDay[i] > 0 ? eliminatedRound[i] || "daily" : null);
    lastDays.push(lastDay[i] > 0 ? lastDay[i] : null);
  }
  await sql(
    "INSERT INTO squid_participants (person_id, cum_pts, eliminated_day, eliminated_round, last_day, updated_at) " +
      "SELECT u.person_id, u.cum_pts, u.eliminated_day, u.eliminated_round, u.last_day, now() " +
      "FROM unnest($1::text[], $2::real[], $3::int[], $4::text[], $5::int[]) AS u(person_id, cum_pts, eliminated_day, eliminated_round, last_day) " +
      "ON CONFLICT (person_id) DO UPDATE SET cum_pts = EXCLUDED.cum_pts, eliminated_day = EXCLUDED.eliminated_day, eliminated_round = EXCLUDED.eliminated_round, last_day = EXCLUDED.last_day, updated_at = now()",
    [ids, cums, elimDays, elimRounds, lastDays]
  );
}

/* ------------------------------------------------------------------ *
 * 天空イカゲーム（6時間ごとに下位半分）
 * ------------------------------------------------------------------ */
export async function runSkyRounds(now: Date = new Date()): Promise<void> {
  await ensureSquidTables();
  const day = squidDay(now);
  if (day < SQUID.skyFromDay) return;
  const base = dayStartMs(SQUID.skyFromDay) + SQUID.skySlotMs;
  const elapsed = Math.floor((now.getTime() - base) / SQUID.skySlotMs) + 1;
  const maxSlot = Math.min(Math.max(elapsed, 0), 12);
  if (maxSlot <= 0) return;
  const done = await sql<{ slot: number }>("SELECT slot FROM squid_rounds");
  const have = new Set(done.map((r) => r.slot));

  for (let slot = 0; slot < maxSlot; slot++) {
    if (have.has(slot)) continue;
    const ranking = await liveRanking(now);
    if (ranking.length <= 1) return;
    const sorted = sortRank(ranking);
    const { boundary } = cutBoundary(sorted, SQUID.skyCutRate);
    const survivors: string[] = [];
    const fallen: string[] = [];
    for (let k = 0; k < sorted.length; k++) {
      if (k < boundary) survivors.push(sorted[k].personId);
      else fallen.push(sorted[k].personId);
    }
    if (fallen.length && survivors.length) {
      await sql(
        "UPDATE squid_participants SET eliminated_day = $1, eliminated_round = 'sky', updated_at = now() WHERE person_id = ANY($2::text[])",
        [day, fallen]
      );
    }
    await sql(
      "INSERT INTO squid_rounds (slot, round_at, alive_before, eliminated, alive_after, computed_at) VALUES ($1,$2,$3,$4,$5, now()) ON CONFLICT (slot) DO NOTHING",
      [slot, new Date(base + slot * SQUID.skySlotMs).toISOString(), sorted.length, fallen.length, survivors.length]
    );
    if (survivors.length <= 1) return;
  }
}

/* ------------------------------------------------------------------ *
 * 生の順位（cum + 今日の途中経過）
 * ------------------------------------------------------------------ */
export async function liveRanking(now: Date = new Date()): Promise<RankRow[]> {
  const alive = await sql<{ person_id: string; cum_pts: number }>(
    "SELECT person_id, cum_pts FROM squid_participants WHERE eliminated_day IS NULL"
  );
  if (!alive.length) return [];
  const day = squidDay(now);
  const partial = new Map<string, { pts: number; lastMs: number }>();
  if (day >= 1 && day <= SQUID.totalDays) {
    const { startIso, endIso } = dayRange(day);
    const rows = await aggregateRaw(startIso, endIso);
    const mod = stageOfDay(day).modifier;
    for (const r of rows) {
      let p = r.raw_pts;
      if (mod === "clip10") p = Math.max(-10, Math.min(10, p));
      else if (mod === "sky") p = r.raw_pts * 0.5;
      partial.set(r.person_id, {
        pts: p,
        lastMs: r.last_action_at ? new Date(r.last_action_at).getTime() : 0,
      });
    }
  }
  return alive.map((a) => {
    const q = partial.get(a.person_id);
    return {
      personId: a.person_id,
      cum: a.cum_pts + (q ? q.pts : 0),
      today: q ? q.pts : 0,
      lastMs: q ? q.lastMs : 0,
    };
  });
}

/* ------------------------------------------------------------------ *
 * 画面用の状態（5分キャッシュ）
 * ------------------------------------------------------------------ */
export type SquidStateTop = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  pts: number;
};

export type SquidStateFallen = {
  id: string;
  name: string;
  handle: string | null;
  day: number;
  round: string | null;
  pts: number;
};

export type SquidState = {
  started: boolean;
  finished: boolean;
  day: number;
  totalDays: number;
  stage: { slug: string; title: string; emoji: string; rule: string };
  total: number;
  alive: number;
  eliminatedTotal: number;
  cutline: number | null;
  projected: number;
  nextCutAtIso: string;
  startIso: string;
  top: SquidStateTop[];
  fallen: SquidStateFallen[];
  winner: SquidStateTop | null;
  days: { day: number; eliminated: number; aliveAfter: number; cutline: number | null }[];
  updatedAtIso: string;
};

let cache: { at: number; value: SquidState } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function getSquidState(now: Date = new Date()): Promise<SquidState> {
  if (cache && now.getTime() - cache.at < CACHE_MS) return cache.value;
  const value = await buildSquidState(now);
  cache = { at: now.getTime(), value };
  return value;
}

export async function buildSquidState(now: Date = new Date()): Promise<SquidState> {
  await ensureSquidTables();
  await runSquidTick(now, false);
  await runSkyRounds(now);

  const day = squidDay(now);
  const stage = stageOfDay(Math.max(1, Math.min(day || 1, SQUID.totalDays)));

  const totals = await sql1<{ n: number }>("SELECT COUNT(*)::int AS n FROM squid_participants");
  const aliveRow = await sql1<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM squid_participants WHERE eliminated_day IS NULL"
  );
  const ranking = await liveRanking(now);
  const sorted = sortRank(ranking);
  const { cutline, eliminate } = cutBoundary(sorted, SQUID.cutRate);

  const topRows = await sql<{ id: string; name: string; handle: string | null; avatar_url: string | null; cum_pts: number }>(
    "SELECT p.id, p.name, p.handle, p.avatar_url, s.cum_pts FROM squid_participants s JOIN people p ON p.id = s.person_id " +
      "WHERE s.eliminated_day IS NULL ORDER BY s.cum_pts DESC, p.id LIMIT 12"
  );
  const fallenRows = await sql<{ id: string; name: string; handle: string | null; eliminated_day: number; eliminated_round: string | null; cum_pts: number }>(
    "SELECT p.id, p.name, p.handle, s.eliminated_day, s.eliminated_round, s.cum_pts FROM squid_participants s JOIN people p ON p.id = s.person_id " +
      "WHERE s.eliminated_day IS NOT NULL ORDER BY s.eliminated_day DESC, s.cum_pts DESC LIMIT 24"
  );
  const dayRows = await sql<{ day: number; eliminated: number; alive_after: number; cutline_pts: number | null }>(
    "SELECT day, eliminated, alive_after, cutline_pts FROM squid_days ORDER BY day ASC"
  );

  const alive = aliveRow?.n ?? 0;
  const total = totals?.n ?? 0;
  const winnerRow = alive === 1 ? topRows[0] ?? null : null;

  const nextMs = (() => {
    const d = day;
    if (d < 1) return new Date(SQUID.startIso).getTime();
    if (d >= SQUID.skyFromDay) {
      const base = dayStartMs(SQUID.skyFromDay) + SQUID.skySlotMs;
      const elapsed = Math.floor((now.getTime() - base) / SQUID.skySlotMs) + 1;
      return base + Math.max(elapsed, 0) * SQUID.skySlotMs;
    }
    return dayStartMs(d + 1);
  })();

  return {
    started: day >= 1,
    finished: day > SQUID.totalDays || (alive === 1 && total > 0),
    day,
    totalDays: SQUID.totalDays,
    stage: { slug: stage.slug, title: stage.title, emoji: stage.emoji, rule: stage.rule },
    total,
    alive,
    eliminatedTotal: Math.max(0, total - alive),
    cutline,
    projected: eliminate,
    nextCutAtIso: new Date(nextMs).toISOString(),
    startIso: SQUID.startIso,
    top: topRows.map((r) => ({ id: r.id, name: r.name, handle: r.handle, avatarUrl: r.avatar_url, pts: r.cum_pts })),
    fallen: fallenRows.map((r) => ({
      id: r.id,
      name: r.name,
      handle: r.handle,
      day: r.eliminated_day,
      round: r.eliminated_round,
      pts: r.cum_pts,
    })),
    winner: winnerRow
      ? { id: winnerRow.id, name: winnerRow.name, handle: winnerRow.handle, avatarUrl: winnerRow.avatar_url, pts: winnerRow.cum_pts }
      : null,
    days: dayRows.map((r) => ({ day: r.day, eliminated: r.eliminated, aliveAfter: r.alive_after, cutline: r.cutline_pts })),
    updatedAtIso: new Date().toISOString(),
  };
}

/** 人物ページ用: そのスレッドのイカゲーム状況 */
export async function getPersonSquidStatus(personId: string): Promise<{
  alive: boolean;
  cumPts: number;
  eliminatedDay: number | null;
  eliminatedRound: string | null;
  rank: number | null;
} | null> {
  await ensureSquidTables();
  // 開始前は全員0ptで並ぶため、バッジは出さない（誤った順位を見せない）
  if (squidDay(new Date()) < 1) return null;
  const row = await sql1<{ cum_pts: number; eliminated_day: number | null; eliminated_round: string | null }>(
    "SELECT cum_pts, eliminated_day, eliminated_round FROM squid_participants WHERE person_id = $1",
    [personId]
  );
  if (!row) return null;
  const better = await sql1<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM squid_participants WHERE eliminated_day IS NULL AND cum_pts > $1",
    [row.cum_pts]
  );
  return {
    alive: row.eliminated_day === null,
    cumPts: row.cum_pts,
    eliminatedDay: row.eliminated_day,
    eliminatedRound: row.eliminated_round,
    rank: row.eliminated_day === null ? (better?.n ?? 0) + 1 : null,
  };
}
