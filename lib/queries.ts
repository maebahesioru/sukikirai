// サーバー専用データアクセス層（PostgreSQL / node-postgres）
import { createHash } from "crypto";
import { sql, sql1, withTx, jstDayStart } from "./db";
import { EVAL_KEYS, DEFAULT_CATEGORY, SOUSENKYO } from "./constants";
import { isSpamContent, calculateSimilarity } from "./spam-filter";
import { fetchFxUser } from "./fxtwitter";
import { anonId } from "./bbs2ch";
import type {
  CommentRow,
  CommentWithReplies,
  EvalStats,
  Poll,
  PollCommentRow,
  PollOption,
  PollType,
  PollWithOptions,
  Person,
  RankingRow,
  VoteStats,
} from "./types";

type PersonWithVotes = Person & { likes: number; dislikes: number; total: number };

// ============================================================
// people
// ============================================================

export async function getPerson(id: string): Promise<Person | null> {
  return sql1<Person>("SELECT * FROM people WHERE id = $1", [id]);
}

export type PeopleSort = "new" | "name" | "votes" | "like";

// ランキング掲載に必要な最低数（少票での上位独占を防ぐ）
// 総合評価ランキング（score / lowscore）に掲載するのに必要な最低評価数
export const EVAL_RANK_MIN = 10;
// 好き率/嫌い率ランキングに掲載するのに必要な最低投票数
export const VOTE_RANK_MIN = 20;

const PEOPLE_ORDER: Record<PeopleSort, string> = {
  new: "p.created_at DESC",
  name: "p.name ASC",
  votes: "COALESCE(v.total,0) DESC, p.name ASC",
  // 好き率順: 20票以上を上位に、未満は下部（一覧の完全性は維持しつつ少票の上位独占を防ぐ）
  like:
    `(CASE WHEN COALESCE(v.total,0) >= ${VOTE_RANK_MIN} THEN v.likes::float / v.total ELSE -1 END) DESC, COALESCE(v.total,0) DESC`,
};

export async function getPeople(f: {
  q?: string;
  tag?: string;
  category?: string;
  sort?: PeopleSort;
  page?: number;
  perPage?: number;
  includeHidden?: boolean;
  includeArchived?: boolean;
}): Promise<{ rows: PersonWithVotes[]; total: number }> {
  const per = Math.min(Math.max(f.perPage ?? 60, 1), 200);
  const page = Math.max(f.page ?? 1, 1);
  const offset = (page - 1) * per;
  const q = (f.q ?? "").trim();
  const tag = (f.tag ?? "").trim();
  const cat = (f.category ?? "").trim();
  const order = PEOPLE_ORDER[f.sort ?? "new"];
  const where = `
    ${f.includeHidden ? "TRUE" : "NOT p.is_hidden"}
    AND ${f.includeArchived ? "TRUE" : "(p.x_status IS NULL OR p.x_status = 'ok')"}
    AND ($1 = '' OR p.name ILIKE '%' || $1 || '%' OR p.id ILIKE '%' || $1 || '%' OR COALESCE(p.handle,'') ILIKE '%' || $1 || '%' OR p.description ILIKE '%' || $1 || '%' OR COALESCE(p.x_description,'') ILIKE '%' || $1 || '%')
    AND ($2 = '' OR $2 = ANY(p.tags))
    AND ($3 = '' OR p.category = $3)`;
  const rows = await sql<PersonWithVotes>(
    `SELECT p.*, COALESCE(v.likes,0)::int AS likes, COALESCE(v.dislikes,0)::int AS dislikes, COALESCE(v.total,0)::int AS total
     FROM people p
     LEFT JOIN (
       SELECT person_id,
         COUNT(*) FILTER (WHERE vote_type='like') AS likes,
         COUNT(*) FILTER (WHERE vote_type='dislike') AS dislikes,
         COUNT(*) AS total
       FROM votes GROUP BY person_id
     ) v ON v.person_id = p.id
     WHERE ${where}
     ORDER BY ${order}
     LIMIT ${per} OFFSET ${offset}`,
    [q, tag, cat]
  );
  const totalRow = await sql1<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM people p WHERE ${where}`,
    [q, tag, cat]
  );
  return { rows, total: totalRow?.c ?? 0 };
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  return sql(
    `SELECT tag, COUNT(*)::int AS count FROM (
       SELECT UNNEST(tags) AS tag FROM people WHERE NOT is_hidden
     ) t GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 100`
  );
}

export async function searchPeople(q: string, limit = 60): Promise<PersonWithVotes[]> {
  const s = q.trim();
  if (!s) return [];
  const sNoAt = s.replace(/^@/, "").toLowerCase();
  if (sNoAt === "") return [];
  const nq = normalizeForSearch(s);
  const tokens = s
    .split(/[\s・･_\-–—.。]+/)
    .map((t) => normalizeForSearch(t))
    .filter((t) => t.length >= 2)
    .slice(0, 6);
  // 事前計算済みの正規化検索列（トリガー維持・GIN trgmインデックス・2026-10-09）
  const hay = "p.search_hay";
  const normCond = [
    `($2 <> '' AND ${hay} LIKE '%' || $2 || '%')`,
    tokens.length
      ? `(${tokens.map((_, i) => `${hay} LIKE '%' || $${3 + i} || '%'`).join(" AND ")})`
      : "",
  ]
    .filter(Boolean)
    .join(" OR ");
  return sql<PersonWithVotes>(
    `SELECT p.*, COALESCE(v.likes,0)::int AS likes, COALESCE(v.dislikes,0)::int AS dislikes, COALESCE(v.total,0)::int AS total
     FROM people p
     LEFT JOIN (
       SELECT person_id,
         COUNT(*) FILTER (WHERE vote_type='like') AS likes,
         COUNT(*) FILTER (WHERE vote_type='dislike') AS dislikes,
         COUNT(*) AS total
       FROM votes GROUP BY person_id
     ) v ON v.person_id = p.id
     WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok') AND (
       p.id = $1
       OR ${normCond}
     )
     ORDER BY (${sqlNorm("p.name")} = $2) DESC,
              (p.id = $1 OR lower(COALESCE(p.handle,'')) = lower($1)) DESC,
              COALESCE(v.total,0) DESC, p.name ASC
     LIMIT ${limit}`,
    [sNoAt, nq, ...tokens]
  );
}

export async function getPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return [];
  return sql<Person>(
    "SELECT * FROM people WHERE id = ANY($1::text[]) AND NOT is_hidden AND (x_status IS NULL OR x_status = 'ok')",
    [ids]
  );
}

export async function getPeopleByHandles(
  handles: string[]
): Promise<Pick<Person, "id" | "handle" | "name">[]> {
  if (handles.length === 0) return [];
  return sql<Pick<Person, "id" | "handle" | "name">>(
    "SELECT id, handle, name FROM people WHERE lower(handle) = ANY($1::text[]) AND NOT is_hidden",
    [handles.map((h) => h.toLowerCase())]
  );
}

export async function getHomeStats(): Promise<{
  people: number;
  votes: number;
  comments: number;
  today_votes: number;
}> {
  const day = jstDayStart();
  const row = await sql1<{ people: number; votes: number; comments: number; today_votes: number }>(
    `SELECT
       (SELECT COUNT(*)::int FROM people WHERE NOT is_hidden AND (x_status IS NULL OR x_status = 'ok')) AS people,
       (SELECT COUNT(*)::int FROM votes) AS votes,
       (SELECT COUNT(*)::int FROM comments WHERE NOT is_hidden) AS comments,
       (SELECT COUNT(*)::int FROM votes WHERE created_at >= $1) AS today_votes`,
    [day]
  );
  return row ?? { people: 0, votes: 0, comments: 0, today_votes: 0 };
}

/** 直近N日の日別推移（JST日付・投票/コメント/評価/新規人物） */
export async function getDailyTrend(days = 7): Promise<
  { day: string; votes: number; comments: number; evals: number; newPeople: number }[]
> {
  const since = new Date(Date.now() - (days + 1) * 86400_000 - 9 * 3600_000);
  const [v, c, e, p] = await Promise.all([
    sql<{ day: string; c: number }>(
      `SELECT (created_at AT TIME ZONE 'Asia/Tokyo')::date::text AS day, COUNT(*)::int AS c
       FROM votes WHERE created_at >= $1 GROUP BY 1`,
      [since]
    ),
    sql<{ day: string; c: number }>(
      `SELECT (created_at AT TIME ZONE 'Asia/Tokyo')::date::text AS day, COUNT(*)::int AS c
       FROM comments WHERE created_at >= $1 GROUP BY 1`,
      [since]
    ),
    sql<{ day: string; c: number }>(
      `SELECT (created_at AT TIME ZONE 'Asia/Tokyo')::date::text AS day, COUNT(*)::int AS c
       FROM evaluations WHERE created_at >= $1 GROUP BY 1`,
      [since]
    ),
    sql<{ day: string; c: number }>(
      `SELECT (created_at AT TIME ZONE 'Asia/Tokyo')::date::text AS day, COUNT(*)::int AS c
       FROM people WHERE created_at >= $1 GROUP BY 1`,
      [since]
    ),
  ]);
  const mv = new Map(v.map((r) => [r.day, r.c]));
  const mc = new Map(c.map((r) => [r.day, r.c]));
  const me = new Map(e.map((r) => [r.day, r.c]));
  const mp = new Map(p.map((r) => [r.day, r.c]));
  const out: { day: string; votes: number; comments: number; evals: number; newPeople: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() + 9 * 3600_000 - i * 86400_000).toISOString().slice(0, 10);
    out.push({
      day,
      votes: mv.get(day) ?? 0,
      comments: mc.get(day) ?? 0,
      evals: me.get(day) ?? 0,
      newPeople: mp.get(day) ?? 0,
    });
  }
  return out;
}

// ============================================================
// votes
// ============================================================

export async function getVoteStats(personId: string): Promise<VoteStats> {
  const r = await sql1<{ likes: number; dislikes: number }>(
    `SELECT COUNT(*) FILTER (WHERE vote_type='like')::int AS likes,
            COUNT(*) FILTER (WHERE vote_type='dislike')::int AS dislikes
     FROM votes WHERE person_id = $1`,
    [personId]
  );
  const likes = r?.likes ?? 0;
  const dislikes = r?.dislikes ?? 0;
  const total = likes + dislikes;
  return { likes, dislikes, total, likePct: total > 0 ? (likes / total) * 100 : 50 };
}

export async function getTodayVote(
  personId: string,
  cookieId: string
): Promise<"like" | "dislike" | null> {
  if (!cookieId) return null;
  const r = await sql1<{ vote_type: "like" | "dislike" }>(
    `SELECT vote_type FROM votes
     WHERE person_id = $1 AND cookie_id = $2 AND created_at >= $3
     ORDER BY created_at DESC LIMIT 1`,
    [personId, cookieId, jstDayStart()]
  );
  return r?.vote_type ?? null;
}

/** このトークンがこの人物に投票したことがあるか（前回投票の表示用・日付無制限） */
export async function getMyVoteEver(
  personId: string,
  cookieId: string
): Promise<"like" | "dislike" | null> {
  if (!cookieId) return null;
  const r = await sql1<{ vote_type: "like" | "dislike" }>(
    `SELECT vote_type FROM votes WHERE person_id = $1 AND cookie_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [personId, cookieId]
  );
  return r?.vote_type ?? null;
}

/** 連続投票日数（JST日基準・今日または昨日までの連続日数） */
export async function getVoteStreak(cookieId: string): Promise<number> {
  if (!cookieId) return 0;
  const rows = await sql<{ d: string }>(
    `SELECT to_char((created_at AT TIME ZONE 'Asia/Tokyo')::date, 'YYYY-MM-DD') AS d
     FROM votes WHERE cookie_id = $1
     GROUP BY 1 ORDER BY 1 DESC LIMIT 400`,
    [cookieId]
  );
  if (rows.length === 0) return 0;
  const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
  const today = jstNow.toISOString().slice(0, 10);
  const prevDay = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  };
  const latest = rows[0].d;
  let cursor: string;
  if (latest === today) cursor = today;
  else if (latest === prevDay(today)) cursor = prevDay(today);
  else return 0;
  let streak = 0;
  for (const r of rows) {
    if (r.d === cursor) {
      streak++;
      cursor = prevDay(cursor);
    } else if (r.d < cursor) {
      break;
    }
  }
  return streak;
}

export type CommentSearchHit = {
  kind: "person" | "poll";
  id: string;
  content: string;
  name: string | null;
  vote_type: "like" | "dislike" | null;
  number: number;
  time_str: string;
  target_id: string;
  target_name: string;
  total: number;
};

/** コメント本文の検索（人物コメント＋投票トークコメント・新しい順） */
export async function searchComments(
  q: string,
  limit = 20
): Promise<{ hits: CommentSearchHit[]; total: number }> {
  const s = q.trim();
  if (!s) return { hits: [], total: 0 };
  const esc = s.replace(/[\\%_]/g, (m) => "\\" + m);
  const [personRows, pollRows] = await Promise.all([
    sql<CommentSearchHit>(
      `SELECT 'person' AS kind, c.id, c.content, c.name, c.vote_type, c.comment_number AS number,
              to_char(c.created_at AT TIME ZONE 'Asia/Tokyo', 'MM/DD HH24:MI') AS time_str,
              p.id AS target_id, p.name AS target_name, count(*) OVER()::int AS total
       FROM comments c JOIN people p ON p.id = c.person_id
       WHERE NOT c.is_hidden AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
         AND c.content ILIKE '%' || $1 || '%'
       ORDER BY c.created_at DESC LIMIT ${limit}`,
      [esc]
    ),
    sql<CommentSearchHit>(
      `SELECT 'poll' AS kind, pc.id, pc.content, pc.name, NULL AS vote_type, pc.comment_number AS number,
              to_char(pc.created_at AT TIME ZONE 'Asia/Tokyo', 'MM/DD HH24:MI') AS time_str,
              pl.id::text AS target_id, pl.title AS target_name, count(*) OVER()::int AS total
       FROM poll_comments pc JOIN polls pl ON pl.id = pc.poll_id
       WHERE NOT pc.is_hidden AND NOT pl.is_hidden
         AND pc.content ILIKE '%' || $1 || '%'
       ORDER BY pc.created_at DESC LIMIT ${limit}`,
      [esc]
    ),
  ]);
  const total = (personRows[0]?.total ?? 0) + (pollRows[0]?.total ?? 0);
  const hits = [...personRows, ...pollRows]
    .sort((a, b) => (a.time_str < b.time_str ? 1 : -1))
    .slice(0, limit);
  return { hits, total };
}

/** 第1回総選挙の順位（期間内投票数ベース・票0はnull） */
export async function getSousenkyoRank(personId: string): Promise<number | null> {
  const r = await sql1<{ rank: number }>(
    `WITH counts AS (
       SELECT p.id, count(*) AS v
       FROM votes v JOIN people p ON p.id = v.person_id
       WHERE v.created_at >= $2 AND v.created_at <= $3
         AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
       GROUP BY p.id
     )
     SELECT (SELECT count(*)::int FROM counts WHERE v > (SELECT v FROM counts WHERE id = $1)) + 1 AS rank
     WHERE EXISTS (SELECT 1 FROM counts WHERE id = $1)`,
    [personId, SOUSENKYO.startIso, SOUSENKYO.endIso]
  );
  return r?.rank ?? null;
}

export async function insertVote(
  personId: string,
  voteType: "like" | "dislike",
  cookieId: string
): Promise<{ ok: boolean; existing?: "like" | "dislike" }> {
  const day = jstDayStart();
  const r = await sql1<{ id: string }>(
    `INSERT INTO votes (person_id, vote_type, cookie_id)
     SELECT $1, $2, $3
     WHERE EXISTS (SELECT 1 FROM people WHERE id = $1 AND NOT is_hidden)
       AND NOT EXISTS (
         SELECT 1 FROM votes WHERE person_id = $1 AND cookie_id = $3 AND created_at >= $4
       )
     RETURNING id`,
    [personId, voteType, cookieId, day]
  );
  if (r) return { ok: true };
  const existing = await getTodayVote(personId, cookieId);
  return { ok: false, existing: existing ?? undefined };
}

// ============================================================
// rankings
// ============================================================

export type RankingType = "popularity" | "unpopular" | "trending" | "daily" | "score" | "lowscore";

export async function getRanking(type: RankingType, limit = 50): Promise<RankingRow[]> {
  if (type === "trending" || type === "daily") {
    const win = type === "daily" ? "24 hours" : "7 days";
    const rows = await sql<Record<string, unknown>>(
      `SELECT p.*, COUNT(*)::int AS recent_votes
       FROM votes v JOIN people p ON p.id = v.person_id
       WHERE v.created_at >= now() - interval '${win}' AND NOT p.is_hidden
         AND (p.x_status IS NULL OR p.x_status = 'ok')
       GROUP BY p.id
       ORDER BY recent_votes DESC, p.name ASC
       LIMIT ${limit}`
    );
    return rows.map((r) => ({
      ...(r as unknown as Person),
      likes: 0,
      dislikes: 0,
      total: 0,
      likePct: 0,
      recentVotes: (r.recent_votes as number) ?? 0,
    }));
  }

  if (type === "score" || type === "lowscore") {
    const rows = await sql<Record<string, unknown>>(
      `SELECT p.*, e.cnt::int AS eval_count,
              e.fun_avg::float AS fun_avg, e.accuracy_avg::float AS accuracy_avg,
              e.influence_avg::float AS influence_avg, e.knowledge_avg::float AS knowledge_avg,
              e.humanity_avg::float AS humanity_avg, e.charisma_avg::float AS charisma_avg,
              e.favor_avg::float AS favor_avg, e.reply_avg::float AS reply_avg
       FROM people p JOIN (
         SELECT person_id, COUNT(*) AS cnt,
                AVG(fun) AS fun_avg, AVG(accuracy) AS accuracy_avg, AVG(influence) AS influence_avg,
                AVG(knowledge) AS knowledge_avg, AVG(humanity) AS humanity_avg, AVG(charisma) AS charisma_avg,
                AVG(favor) AS favor_avg, AVG(reply) AS reply_avg
         FROM evaluations GROUP BY person_id HAVING COUNT(*) >= ${EVAL_RANK_MIN}
       ) e ON e.person_id = p.id
       WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')`
    );
    const mapped = rows.map((r) => {
      const avgs = [
        r.fun_avg, r.accuracy_avg, r.influence_avg, r.knowledge_avg,
        r.humanity_avg, r.charisma_avg, r.favor_avg, r.reply_avg,
      ].filter((v) => typeof v === "number") as number[];
      const overall = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
      return {
        ...(r as unknown as Person),
        likes: 0,
        dislikes: 0,
        total: 0,
        likePct: 0,
        evalCount: r.eval_count as number,
        overall,
      } as RankingRow;
    });
    mapped.sort((a, b) =>
      type === "score"
        ? (b.overall ?? -1) - (a.overall ?? -1) || (b.evalCount ?? 0) - (a.evalCount ?? 0)
        : (a.overall ?? 99) - (b.overall ?? 99) || (b.evalCount ?? 0) - (a.evalCount ?? 0)
    );
    return mapped.slice(0, limit);
  }

  const order =
    type === "popularity" ? "like_pct DESC, total DESC" : "like_pct ASC, total DESC";
  const rows = await sql<Record<string, unknown>>(
    `SELECT p.*, v.likes::int AS likes, v.dislikes::int AS dislikes, v.total::int AS total,
            CASE WHEN v.total > 0 THEN v.likes::float / v.total * 100 ELSE 0 END AS like_pct
     FROM people p JOIN (
       SELECT person_id,
         COUNT(*) FILTER (WHERE vote_type='like') AS likes,
         COUNT(*) FILTER (WHERE vote_type='dislike') AS dislikes,
         COUNT(*) AS total
       FROM votes GROUP BY person_id HAVING COUNT(*) >= ${VOTE_RANK_MIN}
     ) v ON v.person_id = p.id
     WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     ORDER BY ${order}
     LIMIT ${limit}`
  );
  return rows.map((r) => ({
    ...(r as unknown as Person),
    likes: r.likes as number,
    dislikes: r.dislikes as number,
    total: r.total as number,
    likePct: Number(r.like_pct ?? 0),
  }));
}

// ============================================================
// evaluations（8項目5段階）
// ============================================================

export async function getEvalStats(personId: string): Promise<EvalStats> {
  const row = await sql1<Record<string, number | null>>(
    `SELECT COUNT(*)::int AS total,
       COUNT(fun)::int AS fun_c, AVG(fun)::float AS fun_a,
       COUNT(accuracy)::int AS accuracy_c, AVG(accuracy)::float AS accuracy_a,
       COUNT(influence)::int AS influence_c, AVG(influence)::float AS influence_a,
       COUNT(knowledge)::int AS knowledge_c, AVG(knowledge)::float AS knowledge_a,
       COUNT(humanity)::int AS humanity_c, AVG(humanity)::float AS humanity_a,
       COUNT(charisma)::int AS charisma_c, AVG(charisma)::float AS charisma_a,
       COUNT(favor)::int AS favor_c, AVG(favor)::float AS favor_a,
       COUNT(reply)::int AS reply_c, AVG(reply)::float AS reply_a
     FROM evaluations WHERE person_id = $1`,
    [personId]
  );
  const counts: Record<string, number> = {};
  const avgs: Record<string, number> = {};
  for (const key of EVAL_KEYS) {
    counts[key] = Number(row?.[`${key}_c`] ?? 0);
    const a = row?.[`${key}_a`];
    if (typeof a === "number") avgs[key] = a;
  }
  const avgArr = Object.values(avgs);
  const overall = avgArr.length ? avgArr.reduce((a, b) => a + b, 0) / avgArr.length : null;
  return { counts, avgs, total: Number(row?.total ?? 0), overall };
}

export async function getMyEvalToday(
  personId: string,
  cookieId: string
): Promise<Record<string, number | null> | null> {
  if (!cookieId) return null;
  return sql1<Record<string, number | null>>(
    `SELECT fun, accuracy, influence, knowledge, humanity, charisma, favor, reply
     FROM evaluations
     WHERE person_id = $1 AND cookie_id = $2 AND day = (now() AT TIME ZONE 'Asia/Tokyo')::date`,
    [personId, cookieId]
  );
}

export async function insertEvaluation(
  personId: string,
  cookieId: string,
  scores: Partial<Record<string, number | null>>
): Promise<{ ok: boolean; existed: boolean }> {
  const cols = EVAL_KEYS.map((k) => {
    const v = scores[k];
    return typeof v === "number" && v >= 1 && v <= 5 ? Math.round(v) : null;
  });
  const r = await sql1<{ id: string }>(
    `INSERT INTO evaluations (person_id, cookie_id, fun, accuracy, influence, knowledge, humanity, charisma, favor, reply)
     SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
     WHERE EXISTS (SELECT 1 FROM people WHERE id = $1 AND NOT is_hidden)
     ON CONFLICT (person_id, cookie_id, day) DO NOTHING
     RETURNING id`,
    [personId, cookieId, ...cols]
  );
  if (r) return { ok: true, existed: false };
  const p = await getPerson(personId);
  if (!p || p.is_hidden) return { ok: false, existed: false };
  return { ok: false, existed: true };
}

// ============================================================
// comments
// ============================================================

const REACTION_JOIN = `LEFT JOIN (
  SELECT comment_id,
    COUNT(*) FILTER (WHERE reaction_type='good') AS g,
    COUNT(*) FILTER (WHERE reaction_type='bad') AS b
  FROM comment_reactions GROUP BY comment_id
) r ON r.comment_id = c.id`;

const COMMENT_COLS = `c.id, c.person_id, c.comment_number, c.name, c.mail, c.user_id, c.gender, c.age_group,
  c.vote_type, c.content, c.created_at, c.is_hidden, c.is_reported, c.parent_comment_id, c.cookie_id,
  COALESCE(r.g,0)::int AS good_count, COALESCE(r.b,0)::int AS bad_count`;

export async function getComments(
  personId: string,
  opts: { filter?: "all" | "like" | "dislike"; sort?: "newest" | "popular"; page?: number; perPage?: number }
): Promise<{ comments: CommentWithReplies[]; total: number }> {
  const per = Math.min(Math.max(opts.perPage ?? 20, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const off = (page - 1) * per;
  const filter = opts.filter ?? "all";
  const sort = opts.sort ?? "newest";
  const filterSql = filter === "all" ? "" : `AND c.vote_type = '${filter}'`;
  const orderSql =
    sort === "popular"
      ? "ORDER BY (COALESCE(r.g,0)+COALESCE(r.b,0)) DESC, c.created_at DESC"
      : "ORDER BY c.created_at DESC";

  const mains = await sql<CommentRow & { total_count: number }>(
    `SELECT ${COMMENT_COLS}, COUNT(*) OVER()::int AS total_count
     FROM comments c ${REACTION_JOIN}
     WHERE c.person_id = $1 AND NOT c.is_hidden AND c.parent_comment_id IS NULL ${filterSql}
     ${orderSql}
     LIMIT ${per} OFFSET ${off}`,
    [personId]
  );

  let total: number;
  if (mains.length > 0) {
    total = Number(mains[0].total_count);
  } else {
    const t = await sql1<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM comments c
       WHERE c.person_id = $1 AND NOT c.is_hidden AND c.parent_comment_id IS NULL ${filterSql}`,
      [personId]
    );
    total = t?.c ?? 0;
  }

  const ids = mains.map((m) => m.id);
  let replies: CommentRow[] = [];
  if (ids.length > 0) {
    replies = await sql<CommentRow>(
      `SELECT ${COMMENT_COLS}
       FROM comments c ${REACTION_JOIN}
       WHERE c.parent_comment_id = ANY($1::uuid[]) AND NOT c.is_hidden
       ORDER BY c.created_at ASC`,
      [ids]
    );
  }

  const byParent = new Map<string, CommentRow[]>();
  for (const rep of replies) {
    const pid = rep.parent_comment_id as string;
    const arr = byParent.get(pid) ?? [];
    const { cookie_id, ...rest } = rep;
    arr.push({ ...rest, anon_id: anonId(cookie_id ?? null, rep.id) });
    byParent.set(pid, arr);
  }

  const comments: CommentWithReplies[] = mains.map((m) => {
    const { cookie_id, ...rest } = m;
    return {
      ...rest,
      anon_id: anonId(cookie_id ?? null, m.id),
      replies: byParent.get(m.id) ?? [],
    };
  });
  return { comments, total };
}

export type CommentInput = {
  personId: string;
  name: string | null;
  mail?: string | null;
  userId: string | null;
  gender: string | null;
  ageGroup: string | null;
  voteType: "like" | "dislike";
  content: string;
  parentCommentId: string | null;
  cookieId: string;
  deleteKeyHash?: string | null;
};

export async function postComment(
  input: CommentInput
): Promise<{ ok: true; comment: CommentRow } | { ok: false; error: string; status: number }> {
  const spam = isSpamContent(input.content, { allowUrls: true });
  if (spam.isSpam) return { ok: false, error: `スパム対策: ${spam.reason}`, status: 400 };
  if (input.name) {
    const s = isSpamContent(input.name);
    if (s.isSpam) {
      return { ok: false, error: `名前に不適切な内容が含まれています: ${s.reason}`, status: 400 };
    }
  }

  return withTx(async (c) => {
    const person = await c.query<{ x_status: string | null }>(
      "SELECT id, x_status FROM people WHERE id = $1 AND NOT is_hidden",
      [input.personId]
    );
    if (person.rowCount === 0) {
      return { ok: false as const, error: "人物が見つかりません", status: 404 };
    }
    if (person.rows[0]?.x_status && person.rows[0].x_status !== "ok") {
      return { ok: false as const, error: "このページはアーカイブされているため、コメントできません", status: 403 };
    }

    const oneMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM comments WHERE cookie_id = $1 AND created_at >= now() - interval '1 minute'`,
      [input.cookieId]
    );
    if ((oneMin.rows[0]?.c ?? 0) >= 10) {
      return { ok: false as const, error: "コメントの投稿が早すぎます。少し間隔をあけてください", status: 429 };
    }
    const tenMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM comments WHERE cookie_id = $1 AND created_at >= now() - interval '10 minutes'`,
      [input.cookieId]
    );
    if ((tenMin.rows[0]?.c ?? 0) >= 30) {
      return { ok: false as const, error: "投稿が多すぎます。しばらく時間をおいてから再度お試しください", status: 429 };
    }

    const recent = await c.query<{ content: string }>(
      `SELECT content FROM comments WHERE cookie_id = $1 AND person_id = $2 ORDER BY created_at DESC LIMIT 10`,
      [input.cookieId, input.personId]
    );
    for (const row of recent.rows) {
      if (row.content.trim() === input.content.trim()) {
        return { ok: false as const, error: "同じ内容のコメントが既に投稿されています", status: 429 };
      }
      if (calculateSimilarity(row.content, input.content) >= 0.9) {
        return { ok: false as const, error: "類似したコメントが既に投稿されています", status: 429 };
      }
    }

    if (input.parentCommentId) {
      const p = await c.query("SELECT id FROM comments WHERE id = $1 AND person_id = $2", [
        input.parentCommentId,
        input.personId,
      ]);
      if (p.rowCount === 0) {
        return { ok: false as const, error: "返信先のコメントが見つかりません", status: 404 };
      }
    }

    await c.query("SELECT pg_advisory_xact_lock(hashtext('suki:comments:' || $1))", [input.personId]);
    const num = await c.query<{ n: number }>(
      `SELECT (COALESCE(MAX(comment_number),0) + 1)::int AS n FROM comments WHERE person_id = $1`,
      [input.personId]
    );

    const inserted = await c.query<CommentRow>(
      `INSERT INTO comments (person_id, comment_number, name, user_id, gender, age_group, vote_type, content, cookie_id, parent_comment_id, mail, delete_key_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id, person_id, comment_number, name, user_id, gender, age_group,
                 vote_type, content, created_at, 0::int AS good_count, 0::int AS bad_count,
                 is_hidden, is_reported, parent_comment_id`,
      [
        input.personId,
        num.rows[0]?.n ?? 1,
        input.name,
        input.userId,
        input.gender,
        input.ageGroup,
        input.voteType,
        input.content,
        input.cookieId,
        input.parentCommentId,
        input.mail ?? null,
        input.deleteKeyHash ?? null,
      ]
    );
    return { ok: true as const, comment: inserted.rows[0] };
  });
}

/** 削除キー（ハッシュ）が一致すればコメントを削除（2ch式）。true=削除成功 */
export async function deleteCommentByKey(commentId: string, keyHash: string): Promise<boolean> {
  const rows = await sql(`DELETE FROM comments WHERE id = $1 AND delete_key_hash = $2 RETURNING id`, [
    commentId,
    keyHash,
  ]);
  return rows.length > 0;
}

/** 投票トークのコメント版 */
export async function deletePollCommentByKey(commentId: string, keyHash: string): Promise<boolean> {
  const rows = await sql(
    `DELETE FROM poll_comments WHERE id = $1 AND delete_key_hash = $2 RETURNING id`,
    [commentId, keyHash]
  );
  return rows.length > 0;
}

export async function getCommentById(id: string): Promise<CommentRow | null> {
  return sql1<CommentRow>("SELECT * FROM comments WHERE id = $1", [id]);
}

export async function toggleReaction(
  commentId: string,
  type: "good" | "bad",
  cookieId: string
): Promise<{ myReaction: "good" | "bad" | null; good: number; bad: number }> {
  const cid = cookieId || "anon";
  return withTx(async (c) => {
    const existing = await c.query<{ reaction_type: "good" | "bad" }>(
      "SELECT reaction_type FROM comment_reactions WHERE comment_id = $1 AND cookie_id = $2 FOR UPDATE",
      [commentId, cid]
    );
    if (existing.rowCount && existing.rows[0].reaction_type === type) {
      await c.query("DELETE FROM comment_reactions WHERE comment_id = $1 AND cookie_id = $2", [
        commentId,
        cid,
      ]);
    } else {
      await c.query(
        `INSERT INTO comment_reactions (comment_id, cookie_id, reaction_type)
         VALUES ($1,$2,$3)
         ON CONFLICT (comment_id, cookie_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type`,
        [commentId, cid, type]
      );
    }
    const counts = await c.query<{ g: number; b: number }>(
      `SELECT COUNT(*) FILTER (WHERE reaction_type='good')::int AS g,
              COUNT(*) FILTER (WHERE reaction_type='bad')::int AS b
       FROM comment_reactions WHERE comment_id = $1`,
      [commentId]
    );
    const g = counts.rows[0]?.g ?? 0;
    const b = counts.rows[0]?.b ?? 0;
    await c.query("UPDATE comments SET good_count = $2, bad_count = $3 WHERE id = $1", [
      commentId,
      g,
      b,
    ]);
    const mine = await c.query<{ reaction_type: "good" | "bad" }>(
      "SELECT reaction_type FROM comment_reactions WHERE comment_id = $1 AND cookie_id = $2",
      [commentId, cid]
    );
    return {
      myReaction: (mine.rows[0]?.reaction_type ?? null) as "good" | "bad" | null,
      good: g,
      bad: b,
    };
  });
}

export async function insertReport(
  commentId: string,
  reason: string,
  details: string | null
): Promise<boolean> {
  return withTx(async (c) => {
    const ex = await c.query("SELECT id FROM comments WHERE id = $1", [commentId]);
    if (ex.rowCount === 0) return false;
    await c.query("INSERT INTO reports (comment_id, reason, details) VALUES ($1,$2,$3)", [
      commentId,
      reason.slice(0, 200),
      details ? details.slice(0, 500) : null,
    ]);
    await c.query("UPDATE comments SET is_reported = true WHERE id = $1", [commentId]);
    return true;
  });
}

export async function getRecentComments(limit = 10): Promise<
  {
    id: string;
    person_id: string;
    name: string | null;
    vote_type: "like" | "dislike";
    content: string;
    created_at: string;
    comment_number: number;
    person_name: string;
    person_avatar: string | null;
  }[]
> {
  return sql(
    `SELECT c.id, c.person_id, c.name, c.vote_type, c.content, c.created_at, c.comment_number,
            p.name AS person_name, p.avatar_url AS person_avatar
     FROM comments c JOIN people p ON p.id = c.person_id
     WHERE NOT c.is_hidden AND c.parent_comment_id IS NULL
       AND (p.x_status IS NULL OR p.x_status = 'ok')
     ORDER BY c.created_at DESC LIMIT ${limit}`
  );
}

export async function getTagRanking(
  person: Person,
  limit = 5
): Promise<{ id: string; name: string; likePct: number; total: number }[]> {
  if (!person.tags.length) return [];
  const rows = await sql<{ id: string; name: string; like_pct: number; total: number }>(
    `SELECT p.id, p.name,
            CASE WHEN v.total > 0 THEN v.likes::float / v.total * 100 ELSE 0 END AS like_pct,
            v.total::int AS total
     FROM people p JOIN (
       SELECT person_id,
         COUNT(*) FILTER (WHERE vote_type='like') AS likes,
         COUNT(*) FILTER (WHERE vote_type='dislike') AS dislikes,
         COUNT(*) AS total
       FROM votes GROUP BY person_id HAVING COUNT(*) >= ${VOTE_RANK_MIN}
     ) v ON v.person_id = p.id
     WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok') AND p.id <> $1 AND p.tags && $2::text[]
     ORDER BY like_pct DESC, v.total DESC
     LIMIT ${limit}`,
    [person.id, person.tags]
  );
  return rows.map((r) => ({ id: r.id, name: r.name, likePct: Number(r.like_pct), total: r.total }));
}

// ============================================================
// Xユーザーの追加（検索→自動登録）
// ============================================================

export function normalizeHandle(raw: string): string | null {
  const h = raw.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(h)) return null;
  return h;
}

/* ================= 検索用正規化（表記ゆれ吸収） ================= */
// カタカナ→ひらがな・全角英数→半角・区切り文字除去 で「くずは/クズハ」「nazimidori/nazi-midori」等を同一視する。

const KATAKANA_FROM = Array.from({ length: 0x30f6 - 0x30a1 + 1 }, (_, i) =>
  String.fromCharCode(0x30a1 + i)
).join("");
const HIRAGANA_TO = Array.from({ length: 0x30f6 - 0x30a1 + 1 }, (_, i) =>
  String.fromCharCode(0x3041 + i)
).join("");
const ZENKAKU_FROM =
  "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９　";
const HANKAKU_TO = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ";

/** JS側の正規化（クエリ用）: NFKC → 小文字 → カタカナ→ひらがな → 区切り除去 */
export function normalizeForSearch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・･_\-–—.。]/g, "");
}

/** SQL式の正規化（カラム側）: lower → カタカナ→ひらがな → 全角英数→半角 → 区切り除去 */
const sqlNorm = (expr: string) =>
  `replace(replace(replace(replace(replace(replace(replace(translate(translate(lower(${expr}), '${KATAKANA_FROM}', '${HIRAGANA_TO}'), '${ZENKAKU_FROM}', '${HANKAKU_TO}'), ' ', ''), '・', ''), '･', ''), '_', ''), '-', ''), '.', ''), '。', '')`;

export async function findPersonByHandleOrId(handle: string): Promise<Person | null> {
  const h = handle.toLowerCase();
  const slug = h.replace(/_/g, "-");
  return sql1<Person>(
    `SELECT * FROM people
     WHERE lower(handle) = $1 OR id = $1 OR id = $2 OR replace(lower(id), '-', '_') = $1
     LIMIT 1`,
    [h, slug]
  );
}

export async function addPersonFromX(
  handleRaw: string
): Promise<{ person: Person; created: boolean } | { error: string; status: number }> {
  const handle = normalizeHandle(handleRaw);
  if (!handle) {
    return { error: "XのIDの形式が正しくありません（英数字と _ のみ、15文字まで）", status: 400 };
  }
  const existing = await findPersonByHandleOrId(handle);
  if (existing) return { person: existing, created: false };

  const fx = await fetchFxUser(handle);
  if (!fx) {
    return { error: "Xユーザーが見つかりませんでした。IDを確認してください", status: 404 };
  }

  const again = await findPersonByHandleOrId(fx.screenName);
  if (again) return { person: again, created: false };

  const baseSlug =
    fx.screenName.toLowerCase().replace(/_/g, "-").replace(/[^a-z0-9-]/g, "") ||
    `x-user-${Date.now()}`;

  const person = await withTx(async (c) => {
    let id = baseSlug;
    for (let i = 2; i < 60; i++) {
      const dup = await c.query("SELECT 1 FROM people WHERE id = $1", [id]);
      if (dup.rowCount === 0) break;
      id = `${baseSlug}-${i}`;
    }
    const r = await c.query<Person>(
      `INSERT INTO people (id, handle, name, description, x_description, tags, category, avatar_url, followers, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'user')
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [
        id,
        fx.screenName,
        fx.name.slice(0, 100),
        fx.description.slice(0, 500),
        fx.description.slice(0, 500),
        ["X"],
        DEFAULT_CATEGORY,
        fx.avatarUrl,
        fx.followers,
      ]
    );
    if (r.rowCount === 0) {
      const ex = await c.query<Person>(
        "SELECT * FROM people WHERE lower(handle) = lower($1) LIMIT 1",
        [fx.screenName]
      );
      return ex.rows[0];
    }
    return r.rows[0];
  });

  return { person, created: true };
}

// ============================================================
// 投票トーク（polls）
// ============================================================

export async function listPolls(
  limit = 100
): Promise<(Poll & { options: PollOption[]; comment_count: number })[]> {
  const polls = await sql<Poll & { comment_count: number }>(
    `SELECT p.*, (SELECT COUNT(*)::int FROM poll_comments pc WHERE pc.poll_id = p.id AND NOT pc.is_hidden) AS comment_count
     FROM polls p WHERE NOT p.is_hidden
     ORDER BY p.created_at DESC LIMIT ${limit}`
  );
  if (polls.length === 0) return [];
  const opts = await sql<PollOption>(
    `SELECT * FROM poll_options WHERE poll_id = ANY($1::uuid[]) ORDER BY poll_id, option_order ASC`,
    [polls.map((p) => p.id)]
  );
  return polls.map((p) => ({ ...p, options: opts.filter((o) => o.poll_id === p.id) }));
}

export async function getPoll(id: string): Promise<PollWithOptions | null> {
  const poll = await sql1<Poll>("SELECT * FROM polls WHERE id = $1 AND NOT is_hidden", [id]);
  if (!poll) return null;
  const options = await sql<PollOption>(
    "SELECT * FROM poll_options WHERE poll_id = $1 ORDER BY option_order ASC",
    [id]
  );
  return { ...poll, options };
}

export async function createPoll(input: {
  title: string;
  description: string | null;
  pollType: PollType;
  options: { text: string; imageUrl: string | null }[];
  relatedPersonIds: string[];
  creatorCookieId: string;
}): Promise<string> {
  return withTx(async (c) => {
    const p = await c.query<{ id: string }>(
      `INSERT INTO polls (title, description, poll_type, creator_cookie_id, related_person_ids)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [input.title, input.description, input.pollType, input.creatorCookieId, input.relatedPersonIds]
    );
    const pollId = p.rows[0].id;
    for (let i = 0; i < input.options.length; i++) {
      await c.query(
        "INSERT INTO poll_options (poll_id, option_text, image_url, option_order) VALUES ($1,$2,$3,$4)",
        [pollId, input.options[i].text, input.options[i].imageUrl, i]
      );
    }
    return pollId;
  });
}

export async function checkPollVote(
  pollId: string,
  cookieId: string
): Promise<{ hasVoted: boolean; optionId: string | null }> {
  if (!cookieId) return { hasVoted: false, optionId: null };
  const r = await sql1<{ option_id: string }>(
    "SELECT option_id FROM poll_votes WHERE poll_id = $1 AND cookie_id = $2",
    [pollId, cookieId]
  );
  return { hasVoted: !!r, optionId: r?.option_id ?? null };
}

export async function votePoll(
  pollId: string,
  optionId: string,
  cookieId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number; currentOptionId?: string }> {
  try {
    return await withTx(async (c) => {
      const poll = await c.query("SELECT id FROM polls WHERE id = $1 AND NOT is_hidden", [pollId]);
      if (poll.rowCount === 0) return { ok: false as const, error: "投票が見つかりません", status: 404 };
      const opt = await c.query("SELECT id FROM poll_options WHERE id = $1 AND poll_id = $2", [
        optionId,
        pollId,
      ]);
      if (opt.rowCount === 0) return { ok: false as const, error: "選択肢が見つかりません", status: 404 };
      const ex = await c.query<{ option_id: string }>(
        "SELECT option_id FROM poll_votes WHERE poll_id = $1 AND cookie_id = $2",
        [pollId, cookieId]
      );
      if (ex.rowCount && ex.rowCount > 0) {
        return { ok: false as const, error: "既に投票済みです", status: 429, currentOptionId: ex.rows[0].option_id };
      }
      await c.query("INSERT INTO poll_votes (poll_id, option_id, cookie_id) VALUES ($1,$2,$3)", [
        pollId,
        optionId,
        cookieId,
      ]);
      await c.query("UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = $1", [optionId]);
      await c.query("UPDATE polls SET total_votes = total_votes + 1 WHERE id = $1", [pollId]);
      return { ok: true as const };
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "23505") {
      return { ok: false, error: "既に投票済みです", status: 429 };
    }
    throw e;
  }
}

export async function addPollOption(
  pollId: string,
  optionText: string,
  imageUrl: string | null,
  cookieId: string
): Promise<{ ok: true; option: PollOption } | { ok: false; error: string; status: number }> {
  const spam = isSpamContent(optionText);
  if (spam.isSpam) return { ok: false, error: `不適切な内容が含まれています: ${spam.reason}`, status: 400 };

  return withTx(async (c) => {
    const poll = await c.query<{ poll_type: PollType; creator_cookie_id: string }>(
      "SELECT poll_type, creator_cookie_id FROM polls WHERE id = $1 AND NOT is_hidden",
      [pollId]
    );
    if (poll.rowCount === 0) return { ok: false as const, error: "投票が見つかりません", status: 404 };
    if (poll.rows[0].poll_type !== "three_plus_open") {
      return { ok: false as const, error: "この投票では選択肢を追加できません", status: 400 };
    }
    if (poll.rows[0].creator_cookie_id === cookieId) {
      return { ok: false as const, error: "投稿者は選択肢を追加できません", status: 400 };
    }
    const count = await c.query<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM poll_options WHERE poll_id = $1",
      [pollId]
    );
    if ((count.rows[0]?.c ?? 0) >= 20) {
      return { ok: false as const, error: "選択肢は最大20個までです", status: 400 };
    }
    const mine = await c.query<{ c: number }>(
      "SELECT COUNT(*)::int AS c FROM poll_options WHERE poll_id = $1 AND created_by_cookie_id = $2",
      [pollId, cookieId]
    );
    if ((mine.rows[0]?.c ?? 0) >= 3) {
      return { ok: false as const, error: "1つの投票に追加できる選択肢は3つまでです", status: 400 };
    }
    const opt = await c.query<PollOption>(
      `INSERT INTO poll_options (poll_id, option_text, image_url, option_order, created_by_creator, created_by_cookie_id)
       VALUES ($1,$2,$3,$4,FALSE,$5) RETURNING *`,
      [pollId, optionText, imageUrl, count.rows[0]?.c ?? 0, cookieId]
    );
    return { ok: true as const, option: opt.rows[0] };
  });
}

export async function insertPollReport(input: {
  pollCommentId: string;
  reason: string | null;
  details: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  return withTx(async (c) => {
    const cm = await c.query("SELECT id FROM poll_comments WHERE id = $1 AND NOT is_hidden", [
      input.pollCommentId,
    ]);
    if (cm.rowCount === 0) {
      return { ok: false as const, error: "コメントが見つかりません", status: 404 };
    }
    const dup = await c.query(
      "SELECT 1 FROM poll_reports WHERE poll_comment_id = $1 AND created_at >= now() - interval '1 hour' LIMIT 1",
      [input.pollCommentId]
    );
    if (dup.rowCount && dup.rowCount > 0) {
      return { ok: false as const, error: "このコメントは通報済みです", status: 429 };
    }
    await c.query("INSERT INTO poll_reports (poll_comment_id, reason, details) VALUES ($1,$2,$3)", [
      input.pollCommentId,
      input.reason,
      input.details,
    ]);
    await c.query("UPDATE poll_comments SET is_reported = TRUE WHERE id = $1", [input.pollCommentId]);
    return { ok: true as const };
  });
}

const POLL_REACTION_JOIN = `LEFT JOIN (
  SELECT poll_comment_id,
    COUNT(*) FILTER (WHERE reaction_type='good') AS g,
    COUNT(*) FILTER (WHERE reaction_type='bad') AS b
  FROM poll_comment_reactions GROUP BY poll_comment_id
) r ON r.poll_comment_id = c.id`;

export async function getPollComments(
  pollId: string,
  sort: "number" | "new" = "number"
): Promise<{ comments: CommentWithReplies[]; total: number }> {
  const order = sort === "new" ? "c.created_at DESC" : "c.comment_number ASC";
  const rows = await sql<
    PollCommentRow & { good_count: number; bad_count: number; voted_option: string | null }
  >(
    `SELECT c.id, c.poll_id, c.comment_number, c.name, c.mail, c.user_id, c.content, c.created_at,
            c.is_hidden, c.is_reported, c.parent_comment_id, c.cookie_id,
            COALESCE(r.g,0)::int AS good_count, COALESCE(r.b,0)::int AS bad_count,
            o.option_text AS voted_option
     FROM poll_comments c ${POLL_REACTION_JOIN}
     LEFT JOIN poll_votes v ON v.poll_id = c.poll_id AND v.cookie_id = c.cookie_id
     LEFT JOIN poll_options o ON o.id = v.option_id
     WHERE c.poll_id = $1 AND NOT c.is_hidden
     ORDER BY ${order}`,
    [pollId]
  );
  const mains = rows.filter((r) => !r.parent_comment_id);
  const byParent = new Map<string, CommentWithReplies["replies"]>();
  for (const rep of rows) {
    if (!rep.parent_comment_id) continue;
    const arr = byParent.get(rep.parent_comment_id) ?? [];
    const { cookie_id, ...rest } = rep;
    arr.push({
      ...rest,
      anon_id: anonId(cookie_id ?? null, rep.id),
    } as unknown as CommentWithReplies["replies"][number]);
    byParent.set(rep.parent_comment_id, arr);
  }
  return {
    comments: mains.map((m) => {
      const { cookie_id, ...rest } = m;
      return {
        ...(rest as unknown as CommentWithReplies),
        anon_id: anonId(cookie_id ?? null, m.id),
        replies: byParent.get(m.id) ?? [],
      };
    }),
    total: rows.length,
  };
}

export async function insertPollComment(input: {
  pollId: string;
  name: string | null;
  userId: string | null;
  content: string;
  parentCommentId: string | null;
  cookieId: string;
  mail?: string | null;
  deleteKeyHash?: string | null;
}): Promise<{ ok: true; comment: PollCommentRow } | { ok: false; error: string; status: number }> {
  const spam = isSpamContent(input.content, { allowUrls: true });
  if (spam.isSpam) return { ok: false, error: `スパム対策: ${spam.reason}`, status: 400 };
  if (input.name) {
    const s = isSpamContent(input.name);
    if (s.isSpam) return { ok: false, error: `名前に不適切な内容が含まれています: ${s.reason}`, status: 400 };
  }

  return withTx(async (c) => {
    const poll = await c.query("SELECT id FROM polls WHERE id = $1 AND NOT is_hidden", [input.pollId]);
    if (poll.rowCount === 0) return { ok: false as const, error: "投票が見つかりません", status: 404 };

    const oneMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM poll_comments WHERE cookie_id = $1 AND created_at >= now() - interval '1 minute'`,
      [input.cookieId]
    );
    if ((oneMin.rows[0]?.c ?? 0) >= 10) {
      return { ok: false as const, error: "コメントの投稿が早すぎます。少し間隔をあけてください", status: 429 };
    }
    const tenMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM poll_comments WHERE cookie_id = $1 AND created_at >= now() - interval '10 minutes'`,
      [input.cookieId]
    );
    if ((tenMin.rows[0]?.c ?? 0) >= 30) {
      return { ok: false as const, error: "投稿が多すぎます。しばらく時間をおいてから再度お試しください", status: 429 };
    }

    await c.query("SELECT pg_advisory_xact_lock(hashtext('suki:pollcomments:' || $1))", [input.pollId]);
    const num = await c.query<{ n: number }>(
      `SELECT (COALESCE(MAX(comment_number),0) + 1)::int AS n FROM poll_comments WHERE poll_id = $1`,
      [input.pollId]
    );
    const inserted = await c.query<PollCommentRow>(
      `INSERT INTO poll_comments (poll_id, comment_number, name, user_id, content, cookie_id, parent_comment_id, mail, delete_key_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, poll_id, comment_number, name, user_id, content, created_at,
                 0::int AS good_count, 0::int AS bad_count, is_hidden, is_reported, parent_comment_id`,
      [
        input.pollId,
        num.rows[0]?.n ?? 1,
        input.name,
        input.userId,
        input.content,
        input.cookieId,
        input.parentCommentId,
        input.mail ?? null,
        input.deleteKeyHash ?? null,
      ]
    );
    return { ok: true as const, comment: inserted.rows[0] };
  });
}

export async function togglePollReaction(
  pollCommentId: string,
  type: "good" | "bad",
  cookieId: string
): Promise<{ myReaction: "good" | "bad" | null; good: number; bad: number }> {
  const cid = cookieId || "anon";
  return withTx(async (c) => {
    const existing = await c.query<{ reaction_type: "good" | "bad" }>(
      "SELECT reaction_type FROM poll_comment_reactions WHERE poll_comment_id = $1 AND cookie_id = $2 FOR UPDATE",
      [pollCommentId, cid]
    );
    if (existing.rowCount && existing.rows[0].reaction_type === type) {
      await c.query(
        "DELETE FROM poll_comment_reactions WHERE poll_comment_id = $1 AND cookie_id = $2",
        [pollCommentId, cid]
      );
    } else {
      await c.query(
        `INSERT INTO poll_comment_reactions (poll_comment_id, cookie_id, reaction_type)
         VALUES ($1,$2,$3)
         ON CONFLICT (poll_comment_id, cookie_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type`,
        [pollCommentId, cid, type]
      );
    }
    const counts = await c.query<{ g: number; b: number }>(
      `SELECT COUNT(*) FILTER (WHERE reaction_type='good')::int AS g,
              COUNT(*) FILTER (WHERE reaction_type='bad')::int AS b
       FROM poll_comment_reactions WHERE poll_comment_id = $1`,
      [pollCommentId]
    );
    const g = counts.rows[0]?.g ?? 0;
    const b = counts.rows[0]?.b ?? 0;
    await c.query("UPDATE poll_comments SET good_count = $2, bad_count = $3 WHERE id = $1", [
      pollCommentId,
      g,
      b,
    ]);
    const mine = await c.query<{ reaction_type: "good" | "bad" }>(
      "SELECT reaction_type FROM poll_comment_reactions WHERE poll_comment_id = $1 AND cookie_id = $2",
      [pollCommentId, cid]
    );
    return {
      myReaction: (mine.rows[0]?.reaction_type ?? null) as "good" | "bad" | null,
      good: g,
      bad: b,
    };
  });
}

export async function getRelatedPolls(personId: string): Promise<PollWithOptions[]> {
  const polls = await sql<Poll>(
    `SELECT * FROM polls WHERE NOT is_hidden AND related_person_ids @> ARRAY[$1]::text[]
     ORDER BY created_at DESC LIMIT 5`,
    [personId]
  );
  if (polls.length === 0) return [];
  const opts = await sql<PollOption>(
    `SELECT * FROM poll_options WHERE poll_id = ANY($1::uuid[]) ORDER BY poll_id, option_order ASC`,
    [polls.map((p) => p.id)]
  );
  return polls.map((p) => ({ ...p, options: opts.filter((o) => o.poll_id === p.id) }));
}

// ============================================================
// 2ch互換（専ブラ・Siki等向け）
// ============================================================

export async function listPeopleFor2ch(): Promise<
  { id: string; name: string; created_at: string; res_count: number; last_at: string | null }[]
> {
  return sql(
    `SELECT p.id, p.name, p.created_at, (COALESCE(c.cnt,0) + 1)::int AS res_count, c.last_at
    FROM people p
     LEFT JOIN (
       SELECT person_id, COUNT(*) AS cnt, MAX(created_at) AS last_at,
              MAX(created_at) FILTER (WHERE NOT is_hidden AND COALESCE(lower(btrim(mail)), '') <> 'sage') AS last_bump
       FROM comments GROUP BY person_id
     ) c ON c.person_id = p.id
     WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     ORDER BY COALESCE(c.last_bump, p.created_at) DESC` 
  );
}

export async function getPersonCommentsFor2ch(personId: string) {
  return sql<{
    id: string;
    comment_number: number;
    name: string | null;
    vote_type: "like" | "dislike";
    content: string;
    created_at: string;
    cookie_id: string | null;
    mail: string | null;
    is_hidden: boolean;
  }>(
    `SELECT id, comment_number, name, vote_type, content, created_at, cookie_id, mail, is_hidden
     FROM comments WHERE person_id = $1
     ORDER BY comment_number ASC`,
    [personId]
  );
}

export async function listPollsFor2ch(): Promise<
  { id: string; title: string; created_at: string; res_count: number; last_at: string | null }[]
> {
  return sql(
    `SELECT p.id, p.title, p.created_at, (COALESCE(c.cnt,0) + 1)::int AS res_count, c.last_at
     FROM polls p
     LEFT JOIN (
       SELECT poll_id, COUNT(*) AS cnt, MAX(created_at) AS last_at,
              MAX(created_at) FILTER (WHERE NOT is_hidden AND COALESCE(lower(btrim(mail)), '') <> 'sage') AS last_bump
       FROM poll_comments GROUP BY poll_id
     ) c ON c.poll_id = p.id
     WHERE NOT p.is_hidden
     ORDER BY COALESCE(c.last_bump, p.created_at) DESC`
  );
}

export async function getPollCommentsFor2ch(pollId: string) {
  return sql<{
    id: string;
    comment_number: number;
    name: string | null;
    content: string;
    created_at: string;
    cookie_id: string | null;
    voted_option: string | null;
    mail: string | null;
    is_hidden: boolean;
  }>(
    `SELECT c.id, c.comment_number, c.name, c.content, c.created_at, c.cookie_id,
            o.option_text AS voted_option, c.mail, c.is_hidden
     FROM poll_comments c
     LEFT JOIN poll_votes v ON v.poll_id = c.poll_id AND v.cookie_id = c.cookie_id
     LEFT JOIN poll_options o ON o.id = v.option_id
     WHERE c.poll_id = $1
     ORDER BY c.comment_number ASC`,
    [pollId]
  );
}

// ============================================================
// 管理
// ============================================================

export async function adminListReports() {
  return sql<{
    id: string;
    comment_id: string;
    reason: string | null;
    details: string | null;
    created_at: string;
    comment_content: string;
    comment_name: string | null;
    comment_number: number;
    comment_vote_type: "like" | "dislike";
    comment_person_id: string;
    person_name: string | null;
  }>(
    `SELECT r.id, r.comment_id, r.reason, r.details, r.created_at,
            c.content AS comment_content, c.name AS comment_name, c.comment_number,
            c.vote_type AS comment_vote_type, c.person_id AS comment_person_id,
            p.name AS person_name
     FROM reports r
     JOIN comments c ON c.id = r.comment_id
     LEFT JOIN people p ON p.id = c.person_id
     ORDER BY r.created_at DESC LIMIT 200`
  );
}

export async function adminListComments(limit = 200) {
  return sql<CommentRow & { person_name: string | null }>(
    `SELECT c.*, p.name AS person_name
     FROM comments c LEFT JOIN people p ON p.id = c.person_id
     WHERE NOT c.is_hidden AND c.parent_comment_id IS NULL
     ORDER BY c.created_at DESC LIMIT ${limit}`
  );
}

export async function adminDeleteComment(id: string): Promise<boolean> {
  const r = await sql("DELETE FROM comments WHERE id = $1 RETURNING id", [id]);
  return r.length > 0;
}

export async function adminHideComment(id: string): Promise<void> {
  await withTx(async (c) => {
    await c.query("UPDATE comments SET is_hidden = TRUE WHERE id = $1", [id]);
    await c.query("DELETE FROM reports WHERE comment_id = $1", [id]);
  });
}

export async function adminDismissReport(id: string): Promise<void> {
  await sql("DELETE FROM reports WHERE id = $1", [id]);
}

export async function adminListPollReports() {
  return sql<{
    id: string;
    poll_comment_id: string;
    reason: string | null;
    details: string | null;
    created_at: string;
    comment_content: string;
    comment_name: string | null;
    comment_number: number;
    poll_id: string;
    poll_title: string | null;
    voted_option: string | null;
  }>(
    `SELECT r.id, r.poll_comment_id, r.reason, r.details, r.created_at,
            c.content AS comment_content, c.name AS comment_name, c.comment_number,
            c.poll_id, p.title AS poll_title, o.option_text AS voted_option
     FROM poll_reports r
     JOIN poll_comments c ON c.id = r.poll_comment_id
     LEFT JOIN polls p ON p.id = c.poll_id
     LEFT JOIN poll_votes v ON v.poll_id = c.poll_id AND v.cookie_id = c.cookie_id
     LEFT JOIN poll_options o ON o.id = v.option_id
     ORDER BY r.created_at DESC LIMIT 200`
  );
}

export async function adminHidePollComment(id: string): Promise<void> {
  await withTx(async (c) => {
    await c.query("UPDATE poll_comments SET is_hidden = TRUE WHERE id = $1", [id]);
    await c.query("DELETE FROM poll_reports WHERE poll_comment_id = $1", [id]);
  });
}

export async function adminDeletePollComment(id: string): Promise<boolean> {
  const r = await sql("DELETE FROM poll_comments WHERE id = $1 RETURNING id", [id]);
  return r.length > 0;
}

export async function adminDismissPollReport(id: string): Promise<void> {
  await sql("DELETE FROM poll_reports WHERE id = $1", [id]);
}

export async function adminSetVotes(personId: string, likes: number, dislikes: number): Promise<void> {
  const stamp = Math.floor(Date.now() / 1000);
  await withTx(async (c) => {
    await c.query("DELETE FROM votes WHERE person_id = $1", [personId]);
    if (likes > 0) {
      await c.query(
        `INSERT INTO votes (person_id, vote_type, cookie_id)
         SELECT $1, 'like', 'admin_like_' || g::text || '_' || $3 FROM generate_series(1, $2) g`,
        [personId, likes, String(stamp)]
      );
    }
    if (dislikes > 0) {
      await c.query(
        `INSERT INTO votes (person_id, vote_type, cookie_id)
         SELECT $1, 'dislike', 'admin_dislike_' || g::text || '_' || $3 FROM generate_series(1, $2) g`,
        [personId, dislikes, String(stamp)]
      );
    }
  });
}

export async function adminUpdatePerson(
  id: string,
  fields: Partial<{
    name: string;
    description: string;
    tags: string[];
    category: string;
    avatar_url: string | null;
    handle: string | null;
    related: string[];
    is_hidden: boolean;
    x_user_id: string | null;
    x_status: string | null;
    x_checked_at: string | null;
    x_description: string | null;
  }>
): Promise<Person | null> {
  const colMap: Record<string, string> = {
    name: "name",
    description: "description",
    tags: "tags",
    category: "category",
    avatar_url: "avatar_url",
    handle: "handle",
    related: "related",
    is_hidden: "is_hidden",
    x_user_id: "x_user_id",
    x_status: "x_status",
    x_checked_at: "x_checked_at",
    x_description: "x_description",
  };
  const sets: string[] = [];
  const params: unknown[] = [id];
  for (const [key, col] of Object.entries(colMap)) {
    if (key in fields) {
      params.push((fields as Record<string, unknown>)[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (sets.length === 0) return getPerson(id);
  return sql1<Person>(`UPDATE people SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params);
}

export async function adminCreatePerson(input: {
  id: string;
  name: string;
  handle: string | null;
  description: string;
  tags: string[];
  category: string;
  avatar_url: string | null;
  related: string[];
}): Promise<{ ok: true; person: Person } | { ok: false; error: string }> {
  const slug = input.id
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  if (!slug) return { ok: false, error: "IDが不正です" };
  const dup = await sql1("SELECT id FROM people WHERE id = $1", [slug]);
  if (dup) return { ok: false, error: "そのIDは既に存在します" };
  const person = await sql1<Person>(
    `INSERT INTO people (id, handle, name, description, tags, category, avatar_url, related, source)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'admin') RETURNING *`,
    [
      slug,
      input.handle,
      input.name,
      input.description,
      input.tags,
      input.category,
      input.avatar_url,
      input.related,
    ]
  );
  return person ? { ok: true, person } : { ok: false, error: "作成に失敗しました" };
}

export async function adminDeletePerson(id: string): Promise<boolean> {
  const r = await sql("DELETE FROM people WHERE id = $1 RETURNING id", [id]);
  return r.length > 0;
}

export async function getAnalytics(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const r = await sql1<{
    comments: number;
    votes: number;
    like_votes: number;
    dislike_votes: number;
    reactions: number;
    good_reactions: number;
    bad_reactions: number;
    evaluations: number;
  }>(
    `SELECT
       (SELECT COUNT(*)::int FROM comments WHERE created_at >= $1 AND created_at < $2) AS comments,
       (SELECT COUNT(*)::int FROM votes WHERE created_at >= $1 AND created_at < $2) AS votes,
       (SELECT COUNT(*)::int FROM votes WHERE vote_type='like' AND created_at >= $1 AND created_at < $2) AS like_votes,
       (SELECT COUNT(*)::int FROM votes WHERE vote_type='dislike' AND created_at >= $1 AND created_at < $2) AS dislike_votes,
       (SELECT COUNT(*)::int FROM comment_reactions WHERE created_at >= $1 AND created_at < $2) AS reactions,
       (SELECT COUNT(*)::int FROM comment_reactions WHERE reaction_type='good' AND created_at >= $1 AND created_at < $2) AS good_reactions,
       (SELECT COUNT(*)::int FROM comment_reactions WHERE reaction_type='bad' AND created_at >= $1 AND created_at < $2) AS bad_reactions,
       (SELECT COUNT(*)::int FROM evaluations WHERE created_at >= $1 AND created_at < $2) AS evaluations`,
    [start, end]
  );
  return { date: dateStr, ...(r ?? {
    comments: 0, votes: 0, like_votes: 0, dislike_votes: 0,
    reactions: 0, good_reactions: 0, bad_reactions: 0, evaluations: 0,
  }) };
}

/** 好き率での順位（rank: 同率は同順位扱いの簡易計算） */
export async function getLikeRankingPosition(
  personId: string
): Promise<{ rank: number; total: number } | null> {
  const r = await sql1<{ rank: number | null; total: number }>(
    `WITH agg AS (
      SELECT person_id,
             COUNT(*) FILTER (WHERE vote_type='like')::float / COUNT(*) AS pct
      FROM votes GROUP BY person_id HAVING COUNT(*) >= ${VOTE_RANK_MIN}
    )
     SELECT
       CASE WHEN EXISTS (SELECT 1 FROM agg WHERE person_id = $1) THEN
         (SELECT COUNT(*)::int + 1 FROM agg a WHERE a.pct > (SELECT pct FROM agg WHERE person_id = $1))
       END AS rank,
       (SELECT COUNT(*)::int FROM agg) AS total`,
    [personId]
  );
  if (!r || r.rank == null) return null;
  return { rank: r.rank, total: r.total };
}

/** サイトマップ用 */
export async function listSitemapEntries(): Promise<{ id: string; updated_at: string }[]> {
  return sql(
    "SELECT id, updated_at FROM people WHERE NOT is_hidden AND (x_status IS NULL OR x_status = 'ok') ORDER BY created_at DESC"
  );
}

/** 投票トーク用アップロード画像（DB保存） */
export async function insertPollUpload(mime: string, size: number, data: Buffer): Promise<string> {
  const r = await sql1<{ id: string }>(
    "INSERT INTO poll_uploads (mime, size, data) VALUES ($1,$2,$3) RETURNING id",
    [mime, size, data]
  );
  return r!.id;
}

export async function getPollUpload(id: string): Promise<{ mime: string; data: Buffer } | null> {
  return sql1<{ mime: string; data: Buffer }>(
    "SELECT mime, data FROM poll_uploads WHERE id = $1",
    [id]
  );
}

/** タグ自動付与の対象一覧（mode=empty はタグが空の人だけ） */
export async function listTagTargets(
  mode: "all" | "empty"
): Promise<{ id: string; name: string; handle: string | null; tags: string[]; category: string; bio: string; x_website: string | null; x_tweet_signals: string | null }[]> {
  return sql<{ id: string; name: string; handle: string | null; tags: string[]; category: string; bio: string; x_website: string | null; x_tweet_signals: string | null }>(
    `SELECT id, name, handle, tags, category, x_website, x_tweet_signals, COALESCE(NULLIF(x_description, ''), description, '') AS bio
     FROM people
     WHERE NOT is_hidden ${mode === "empty" ? "AND tags = '{}'::text[]" : ""}`
  );
}

/** 複数人のタグ・カテゴリをまとめて更新（チャンク実行） */
export async function setPeopleTags(
  updates: { id: string; tags: string[]; category: string }[]
): Promise<void> {
  for (let i = 0; i < updates.length; i += 200) {
    const chunk = updates.slice(i, i + 200);
    const values: string[] = [];
    const params: unknown[] = [];
    chunk.forEach((u, j) => {
      params.push(u.id, u.tags, u.category);
      values.push(`($${j * 3 + 1}, $${j * 3 + 2}::text[], $${j * 3 + 3})`);
    });
    await sql(
      `UPDATE people p SET tags = v.tags, category = v.category
       FROM (VALUES ${values.join(",")}) AS v(id, tags, category)
       WHERE p.id = v.id`,
      params
    );
  }
}

/* ================= 統計ページ用 ================= */

/** 評価の総数 */
/** 投票の時間帯ヒストグラム（JST・0-23時） */
export async function getVoteHourHistogram(): Promise<number[]> {
  const rows = await sql<{ h: number; n: number }>(
    `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo')::int AS h, COUNT(*)::int AS n
     FROM votes GROUP BY 1`
  );
  const out = new Array(24).fill(0) as number[];
  for (const r of rows) out[r.h] = r.n;
  return out;
}

/** 投票の曜日ヒストグラム（JST・0=日〜6=土） */
export async function getVoteWeekdayHistogram(): Promise<number[]> {
  const rows = await sql<{ d: number; n: number }>(
    `SELECT EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Tokyo')::int AS d, COUNT(*)::int AS n
     FROM votes GROUP BY 1`
  );
  const out = new Array(7).fill(0) as number[];
  for (const r of rows) out[r.d] = r.n;
  return out;
}

/** 8項目の全体平均（1〜5） */
export async function getItemAverages(): Promise<Record<string, number | null>> {
  const r = await sql1<Record<string, number | null>>(
    `SELECT AVG(fun)::float AS fun, AVG(accuracy)::float AS accuracy, AVG(influence)::float AS influence,
            AVG(knowledge)::float AS knowledge, AVG(humanity)::float AS humanity, AVG(charisma)::float AS charisma,
            AVG(favor)::float AS favor, AVG(reply)::float AS reply
     FROM evaluations`
  );
  return r ?? {};
}

/** 評価数が多い人物 TOP n */
export async function getTopEvaluated(
  limit = 5
): Promise<{ id: string; name: string; avatar_url: string | null; cnt: number }[]> {
  return sql<{ id: string; name: string; avatar_url: string | null; cnt: number }>(
    `SELECT p.id, p.name, p.avatar_url, COUNT(*)::int AS cnt
     FROM evaluations e JOIN people p ON p.id = e.person_id
     WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     GROUP BY p.id ORDER BY cnt DESC, p.name ASC LIMIT ${limit}`
  );
}

/** コメント数が多い人物 TOP n */
export async function getTopCommented(
  limit = 5
): Promise<{ id: string; name: string; avatar_url: string | null; cnt: number }[]> {
  return sql<{ id: string; name: string; avatar_url: string | null; cnt: number }>(
    `SELECT p.id, p.name, p.avatar_url, COUNT(*)::int AS cnt
     FROM comments c JOIN people p ON p.id = c.person_id
     WHERE NOT c.is_hidden AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     GROUP BY p.id ORDER BY cnt DESC, p.name ASC LIMIT ${limit}`
  );
}

/** 日別の好き/嫌い内訳（直近days日・JST） */
export async function getLikeRatioTrend(
  days = 30
): Promise<{ day: string; total: number; likes: number }[]> {
  const since = new Date(Date.now() - (days + 1) * 86400_000 - 9 * 3600_000);
  const rows = await sql<{ day: string; total: number; likes: number }>(
    `SELECT (created_at AT TIME ZONE 'Asia/Tokyo')::date::text AS day,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE vote_type = 'like')::int AS likes
     FROM votes WHERE created_at >= $1 GROUP BY 1`,
    [since]
  );
  const m = new Map(rows.map((r) => [r.day, r]));
  const out: { day: string; total: number; likes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() + 9 * 3600_000 - i * 86400_000).toISOString().slice(0, 10);
    const r = m.get(day);
    out.push({ day, total: r?.total ?? 0, likes: r?.likes ?? 0 });
  }
  return out;
}

/** 全票の好き/嫌い合計 */
export async function getVoteTypeTotals(): Promise<{ likes: number; dislikes: number }> {
  const r = await sql1<{ likes: number; dislikes: number }>(
    `SELECT COUNT(*) FILTER (WHERE vote_type='like')::int AS likes,
            COUNT(*) FILTER (WHERE vote_type='dislike')::int AS dislikes FROM votes`
  );
  return r ?? { likes: 0, dislikes: 0 };
}

/** 時間帯×曜日の投票ヒートマップ（JST・[7][24]・0=日曜） */
export async function getVoteHeatmap(): Promise<number[][]> {
  const rows = await sql<{ d: number; h: number; n: number }>(
    `SELECT EXTRACT(DOW FROM created_at AT TIME ZONE 'Asia/Tokyo')::int AS d,
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tokyo')::int AS h,
            COUNT(*)::int AS n
     FROM votes GROUP BY 1, 2`
  );
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0)) as number[][];
  for (const r of rows) grid[r.d][r.h] = r.n;
  return grid;
}

/** フォロワー数分布（6バケット・末尾=不明） */
export async function getFollowerBuckets(): Promise<number[]> {
  const rows = await sql<{ b: number; n: number }>(
    `SELECT CASE
       WHEN followers IS NULL THEN 5
       WHEN followers < 100 THEN 0
       WHEN followers < 1000 THEN 1
       WHEN followers < 10000 THEN 2
       WHEN followers < 100000 THEN 3
       ELSE 4 END AS b, COUNT(*)::int AS n
     FROM people WHERE NOT is_hidden GROUP BY 1`
  );
  const out = new Array(6).fill(0) as number[];
  for (const r of rows) out[r.b] = r.n;
  return out;
}

/** 総選挙期間の累計票数 */
export async function getSousenkyoTotalVotes(): Promise<number> {
  const r = await sql1<{ c: number }>(
    `SELECT COUNT(*)::int AS c FROM votes WHERE created_at >= $1`,
    [SOUSENKYO.startIso]
  );
  return r?.c ?? 0;
}

export async function getEvalTotalCount(): Promise<number> {
  const r = await sql1<{ c: number }>("SELECT COUNT(*)::int AS c FROM evaluations");
  return r?.c ?? 0;
}

const SCORE_SUB = `
  (SELECT person_id, AVG(item_avg) AS score FROM (
     ${EVAL_KEYS.map((k) => `SELECT person_id, ${k}::numeric AS item_avg FROM evaluations WHERE ${k} IS NOT NULL`).join(" UNION ALL ")}
   ) u GROUP BY person_id)`;

const VOTE_SUB = `
  (SELECT person_id, COUNT(*)::int AS votes,
     (COUNT(*) FILTER (WHERE vote_type='like')::numeric / NULLIF(COUNT(*),0) * 100) AS like_pct
   FROM votes GROUP BY person_id)`;

export type CategoryStat = {
  category: string;
  people: number;
  votes: number;
  avg_like: number | null;
  avg_score: number | null;
};

export async function getCategoryStats(): Promise<CategoryStat[]> {
  return sql<CategoryStat>(
    `SELECT p.category,
       COUNT(*)::int AS people,
       COALESCE(SUM(v.votes),0)::int AS votes,
       ROUND(AVG(v.like_pct)::numeric, 1)::float AS avg_like,
       ROUND(AVG(s.score)::numeric, 2)::float AS avg_score
     FROM people p
     LEFT JOIN ${VOTE_SUB} v ON v.person_id = p.id
     LEFT JOIN ${SCORE_SUB} s ON s.person_id = p.id
     WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     GROUP BY p.category
     ORDER BY people DESC`
  );
}

export type TagStat = {
  tag: string;
  people: number;
  votes: number;
  avg_like: number | null;
  avg_score: number | null;
};

export async function getTagStats(minPeople = 2, limit = 20): Promise<TagStat[]> {
  return sql<TagStat>(
    `SELECT t.tag,
       COUNT(DISTINCT t.person_id)::int AS people,
       COALESCE(SUM(v.votes),0)::int AS votes,
       ROUND(AVG(v.like_pct)::numeric, 1)::float AS avg_like,
       ROUND(AVG(s.score)::numeric, 2)::float AS avg_score
     FROM (
       SELECT p.id AS person_id, x.tag
       FROM people p, unnest(p.tags) AS x(tag)
       WHERE NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     ) t
     LEFT JOIN ${VOTE_SUB} v ON v.person_id = t.person_id
     LEFT JOIN ${SCORE_SUB} s ON s.person_id = t.person_id
     GROUP BY t.tag
     HAVING COUNT(DISTINCT t.person_id) >= ${Math.max(1, Math.floor(minPeople))}
     ORDER BY people DESC, t.tag ASC
     LIMIT ${Math.max(1, Math.floor(limit))}`
  );
}

/** 8項目の相関（ペアごとのピアソン相関） */
export async function getEvalCorrelation(): Promise<{ a: string; b: string; value: number | null }[]> {
  const pairs: [string, string][] = [];
  for (let i = 0; i < EVAL_KEYS.length; i++) {
    for (let j = i + 1; j < EVAL_KEYS.length; j++) {
      pairs.push([EVAL_KEYS[i], EVAL_KEYS[j]]);
    }
  }
  const sel = pairs
    .map(([a, b]) => `corr(${a}::numeric, ${b}::numeric) AS "${a}__${b}"`)
    .join(", ");
  const row = await sql1<Record<string, number | null>>(`SELECT ${sel} FROM evaluations`);
  return pairs.map(([a, b]) => ({
    a,
    b,
    value: row?.[`${a}__${b}`] ?? null,
  }));
}

/** 各項目のスコア分布（1〜5の件数） */
export async function getScoreDistribution(): Promise<Record<string, number[]>> {
  const parts = EVAL_KEYS.map(
    (k) => `SELECT '${k}' AS item, ${k} AS score FROM evaluations WHERE ${k} IS NOT NULL`
  );
  const rows = await sql<{ item: string; score: number; n: number }>(
    `SELECT item, score, COUNT(*)::int AS n
     FROM (${parts.join(" UNION ALL ")}) u
     GROUP BY item, score`
  );
  const out: Record<string, number[]> = {};
  for (const k of EVAL_KEYS) out[k] = [0, 0, 0, 0, 0];
  for (const r of rows) {
    const idx = Number(r.score) - 1;
    if (out[r.item] && idx >= 0 && idx < 5) out[r.item][idx] = r.n;
  }
  return out;
}

/* ================= 入力中サジェスト ================= */

export async function suggestPeople(
  q: string,
  limit = 8
): Promise<{ id: string; name: string; handle: string | null; avatar_url: string | null }[]> {
  const query = q.trim();
  if (!query) return [];
  const h = query.replace(/^@/, "");
  const nq = normalizeForSearch(query);
  // 事前計算済みの正規化検索列（2026-10-09）
  const hay = "search_hay";
  return sql<{ id: string; name: string; handle: string | null; avatar_url: string | null }>(
    `SELECT id, name, handle, avatar_url FROM people
     WHERE NOT is_hidden AND (x_status IS NULL OR x_status = 'ok')
       AND ($3 <> '' AND ${hay} LIKE '%' || $3 || '%')
     ORDER BY (lower(COALESCE(handle,'')) = lower($2)) DESC,
              (name ILIKE $1 || '%') DESC,
              ($3 <> '' AND ${hay} LIKE $3 || '%') DESC,
              COALESCE(followers, 0) DESC
     LIMIT ${Math.max(1, Math.floor(limit))}`,
    [query, h, nq]
  );
}

/* ================= 管理スレ（meta） ================= */

export async function getMetaPostsFor2ch() {
  return sql<{
    id: string;
    name: string | null;
    content: string;
    created_at: string;
    cookie_id: string | null;
    mail: string | null;
    is_hidden: boolean;
  }>(
    `SELECT id, name, content, created_at, cookie_id, mail, is_hidden
     FROM meta_posts
     ORDER BY created_at ASC, id ASC`
  );
}

export async function getMetaPosts(limit = 500) {
  const rows = await sql<{
    id: string;
    name: string | null;
    content: string;
    created_at: string;
    cookie_id: string | null;
    is_hidden: boolean;
  }>(
    `SELECT id, name, content, created_at, cookie_id, is_hidden
     FROM meta_posts
     WHERE NOT is_hidden
     ORDER BY created_at ASC, id ASC
     LIMIT $1`,
    [limit]
  );
  return rows.map((r) => {
    const { cookie_id, ...rest } = r;
    return { ...rest, anon_id: anonId(cookie_id ?? null, r.id) };
  });
}

export async function getMetaResCount(): Promise<number> {
  const rows = await sql<{ c: number }>(`SELECT (COUNT(*) + 1)::int AS c FROM meta_posts`);
  return rows[0]?.c ?? 1;
}

export async function insertMetaPost(input: {
  name: string | null;
  content: string;
  cookieId: string;
  mail?: string | null;
}): Promise<
  | { ok: true; post: { id: string; name: string | null; content: string; created_at: string; is_hidden: boolean } }
  | { ok: false; error: string; status: number }
> {
  const spam = isSpamContent(input.content, { allowUrls: true });
  if (spam.isSpam) return { ok: false, error: `スパム対策: ${spam.reason}`, status: 400 };
  if (input.name) {
    const s = isSpamContent(input.name);
    if (s.isSpam) return { ok: false, error: `名前に不適切な内容が含まれています: ${s.reason}`, status: 400 };
  }

  return withTx(async (c) => {
    const oneMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM meta_posts WHERE cookie_id = $1 AND created_at >= now() - interval '1 minute'`,
      [input.cookieId]
    );
    if ((oneMin.rows[0]?.c ?? 0) >= 10) {
      return { ok: false as const, error: "投稿が早すぎます。少し間隔をあけてください", status: 429 };
    }
    const tenMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM meta_posts WHERE cookie_id = $1 AND created_at >= now() - interval '10 minutes'`,
      [input.cookieId]
    );
    if ((tenMin.rows[0]?.c ?? 0) >= 30) {
      return { ok: false as const, error: "投稿が多すぎます。しばらく時間をおいてから再度お試しください", status: 429 };
    }

    const inserted = await c.query<{
      id: string;
      name: string | null;
      content: string;
      created_at: string;
      is_hidden: boolean;
    }>(
      `INSERT INTO meta_posts (name, content, cookie_id, mail)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, content, created_at, is_hidden`,
      [input.name, input.content, input.cookieId, input.mail ?? null]
    );
    return { ok: true as const, post: inserted.rows[0] };
  });
}

// ============================================================
// 今日のまとめ / 総選挙
// ============================================================

export async function getTodayStats(): Promise<{
  votes: number;
  voters: number;
  comments: number;
  newPeople: number;
}> {
  const day = jstDayStart();
  const [v, uv, c, np] = await Promise.all([
    sql1<{ c: number }>("SELECT COUNT(*)::int AS c FROM votes WHERE created_at >= $1", [day]),
    sql1<{ c: number }>("SELECT COUNT(DISTINCT cookie_id)::int AS c FROM votes WHERE created_at >= $1", [day]),
    sql1<{ c: number }>("SELECT COUNT(*)::int AS c FROM comments WHERE created_at >= $1 AND NOT is_hidden", [day]),
    sql1<{ c: number }>("SELECT COUNT(*)::int AS c FROM people WHERE created_at >= $1 AND NOT is_hidden", [day]),
  ]);
  return { votes: v?.c ?? 0, voters: uv?.c ?? 0, comments: c?.c ?? 0, newPeople: np?.c ?? 0 };
}

export async function getNewPeopleToday(limit = 6): Promise<PersonWithVotes[]> {
  return sql<PersonWithVotes>(
    `SELECT p.*, COALESCE(v.likes,0)::int AS likes, COALESCE(v.dislikes,0)::int AS dislikes, COALESCE(v.total,0)::int AS total
     FROM people p
     LEFT JOIN (
       SELECT person_id,
         COUNT(*) FILTER (WHERE vote_type='like') AS likes,
         COUNT(*) FILTER (WHERE vote_type='dislike') AS dislikes,
         COUNT(*) AS total
       FROM votes GROUP BY person_id
     ) v ON v.person_id = p.id
     WHERE p.created_at >= $1 AND NOT p.is_hidden AND (p.x_status IS NULL OR p.x_status = 'ok')
     ORDER BY p.created_at DESC
     LIMIT ${limit}`,
    [jstDayStart()]
  );
}

export type SousenkyoRow = {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  recentVotes: number;
};

export async function getSousenkyoRanking(limit = 20): Promise<SousenkyoRow[]> {
  const rows = await sql<Record<string, unknown>>(
    `SELECT p.*, COUNT(*)::int AS recent_votes
     FROM votes v JOIN people p ON p.id = v.person_id
     WHERE v.created_at >= $1 AND NOT p.is_hidden
       AND (p.x_status IS NULL OR p.x_status = 'ok')
     GROUP BY p.id
     ORDER BY recent_votes DESC, p.name ASC
     LIMIT ${limit}`,
    [SOUSENKYO.startIso]
  );
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    handle: (r.handle as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    recentVotes: (r.recent_votes as number) ?? 0,
  }));
}

/** 発行済みトークンか（トークン状態化・偽造トークンでの投票防止） */
export async function isKnownToken(token: string): Promise<boolean> {
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = await sql(`SELECT 1 FROM voter_tokens WHERE token_hash = $1 AND expires_at > now() LIMIT 1`, [hash]);
  return rows.length > 0;
}

/** 発行済みトークンの発行時刻（未登録/期限切れはnull）。mint+use攻撃対策用 */
export async function tokenIssuedAt(token: string): Promise<Date | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = await sql<{ issued_at: Date }>(
    `SELECT issued_at FROM voter_tokens WHERE token_hash = $1 AND expires_at > now() LIMIT 1`,
    [hash]
  );
  return rows[0]?.issued_at ?? null;
}

/** トークンを発行済みとして登録（/api/terms用） */
export async function registerToken(token: string, expiresAt: Date): Promise<void> {
  const hash = createHash("sha256").update(token).digest("hex");
  await sql(
    `INSERT INTO voter_tokens (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING`,
    [hash, expiresAt]
  );
}
