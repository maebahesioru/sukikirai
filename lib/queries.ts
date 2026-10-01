// サーバー専用データアクセス層（PostgreSQL / node-postgres）
import { sql, sql1, withTx, jstDayStart } from "./db";
import { EVAL_KEYS, DEFAULT_CATEGORY } from "./constants";
import { isSpamContent, calculateSimilarity } from "./spam-filter";
import { fetchFxUser } from "./fxtwitter";
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

const PEOPLE_ORDER: Record<PeopleSort, string> = {
  new: "p.created_at DESC",
  name: "p.name ASC",
  votes: "COALESCE(v.total,0) DESC, p.name ASC",
  like:
    "(CASE WHEN COALESCE(v.total,0) > 0 THEN v.likes::float / v.total ELSE -1 END) DESC, COALESCE(v.total,0) DESC",
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
       p.name ILIKE '%' || $1 || '%' OR p.id ILIKE '%' || $1 || '%'
       OR COALESCE(p.handle,'') ILIKE '%' || $1 || '%' OR p.description ILIKE '%' || $1 || '%'
      OR COALESCE(p.x_description,'') ILIKE '%' || $1 || '%'
       OR EXISTS (SELECT 1 FROM unnest(p.tags) tg WHERE tg ILIKE '%' || $1 || '%')
       OR p.id = $2
     )
     ORDER BY (p.id = $2 OR lower(COALESCE(p.handle,'')) = lower($2)) DESC,
              COALESCE(v.total,0) DESC, p.name ASC
     LIMIT ${limit}`,
    [s, sNoAt]
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

export async function insertVote(
  personId: string,
  voteType: "like" | "dislike",
  cookieId: string,
  ip: string | null
): Promise<{ ok: boolean; existing?: "like" | "dislike" }> {
  const day = jstDayStart();
  const r = await sql1<{ id: string }>(
    `INSERT INTO votes (person_id, vote_type, cookie_id, ip_address)
     SELECT $1, $2, $3, $4
     WHERE EXISTS (SELECT 1 FROM people WHERE id = $1 AND NOT is_hidden)
       AND NOT EXISTS (
         SELECT 1 FROM votes WHERE person_id = $1 AND cookie_id = $3 AND created_at >= $5
       )
     RETURNING id`,
    [personId, voteType, cookieId, ip, day]
  );
  if (r) return { ok: true };
  const existing = await getTodayVote(personId, cookieId);
  return { ok: false, existing: existing ?? undefined };
}

// ============================================================
// rankings
// ============================================================

export type RankingType = "popularity" | "unpopular" | "trending" | "score";

export async function getRanking(type: RankingType, limit = 50): Promise<RankingRow[]> {
  if (type === "trending") {
    const rows = await sql<Record<string, unknown>>(
      `SELECT p.*, COUNT(*)::int AS recent_votes
       FROM votes v JOIN people p ON p.id = v.person_id
       WHERE v.created_at >= now() - interval '7 days' AND NOT p.is_hidden
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

  if (type === "score") {
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
         FROM evaluations GROUP BY person_id HAVING COUNT(*) >= 1
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
    mapped.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
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
       FROM votes GROUP BY person_id HAVING COUNT(*) >= 1
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

const COMMENT_COLS = `c.id, c.person_id, c.comment_number, c.name, c.user_id, c.gender, c.age_group,
  c.vote_type, c.content, c.created_at, c.is_hidden, c.is_reported, c.parent_comment_id,
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
    arr.push(rep);
    byParent.set(pid, arr);
  }

  const comments: CommentWithReplies[] = mains.map((m) => ({
    ...m,
    replies: byParent.get(m.id) ?? [],
  }));
  return { comments, total };
}

export type CommentInput = {
  personId: string;
  name: string | null;
  userId: string | null;
  gender: string | null;
  ageGroup: string | null;
  voteType: "like" | "dislike";
  content: string;
  parentCommentId: string | null;
  cookieId: string;
  ip: string | null;
};

export async function postComment(
  input: CommentInput
): Promise<{ ok: true; comment: CommentRow } | { ok: false; error: string; status: number }> {
  const spam = isSpamContent(input.content);
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
    if ((oneMin.rows[0]?.c ?? 0) >= 2) {
      return { ok: false as const, error: "コメントの投稿が早すぎます。1分以上間隔をあけてください", status: 429 };
    }
    const tenMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM comments WHERE cookie_id = $1 AND created_at >= now() - interval '10 minutes'`,
      [input.cookieId]
    );
    if ((tenMin.rows[0]?.c ?? 0) >= 5) {
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
      `INSERT INTO comments (person_id, comment_number, name, user_id, gender, age_group, vote_type, content, cookie_id, parent_comment_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
      ]
    );
    return { ok: true as const, comment: inserted.rows[0] };
  });
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
       FROM votes GROUP BY person_id HAVING COUNT(*) >= 1
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
    `SELECT c.id, c.poll_id, c.comment_number, c.name, c.user_id, c.content, c.created_at,
            c.is_hidden, c.is_reported, c.parent_comment_id,
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
    arr.push(rep as unknown as CommentWithReplies["replies"][number]);
    byParent.set(rep.parent_comment_id, arr);
  }
  return {
    comments: mains.map((m) => ({
      ...(m as unknown as CommentWithReplies),
      replies: byParent.get(m.id) ?? [],
    })),
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
}): Promise<{ ok: true; comment: PollCommentRow } | { ok: false; error: string; status: number }> {
  const spam = isSpamContent(input.content);
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
    if ((oneMin.rows[0]?.c ?? 0) >= 2) {
      return { ok: false as const, error: "コメントの投稿が早すぎます。1分以上間隔をあけてください", status: 429 };
    }
    const tenMin = await c.query<{ c: number }>(
      `SELECT COUNT(*)::int AS c FROM poll_comments WHERE cookie_id = $1 AND created_at >= now() - interval '10 minutes'`,
      [input.cookieId]
    );
    if ((tenMin.rows[0]?.c ?? 0) >= 5) {
      return { ok: false as const, error: "投稿が多すぎます。しばらく時間をおいてから再度お試しください", status: 429 };
    }

    await c.query("SELECT pg_advisory_xact_lock(hashtext('suki:pollcomments:' || $1))", [input.pollId]);
    const num = await c.query<{ n: number }>(
      `SELECT (COALESCE(MAX(comment_number),0) + 1)::int AS n FROM poll_comments WHERE poll_id = $1`,
      [input.pollId]
    );
    const inserted = await c.query<PollCommentRow>(
      `INSERT INTO poll_comments (poll_id, comment_number, name, user_id, content, cookie_id, parent_comment_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
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
        `INSERT INTO votes (person_id, vote_type, cookie_id, ip_address)
         SELECT $1, 'like', 'admin_like_' || g::text || '_' || $3, NULL FROM generate_series(1, $2) g`,
        [personId, likes, String(stamp)]
      );
    }
    if (dislikes > 0) {
      await c.query(
        `INSERT INTO votes (person_id, vote_type, cookie_id, ip_address)
         SELECT $1, 'dislike', 'admin_dislike_' || g::text || '_' || $3, NULL FROM generate_series(1, $2) g`,
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
       FROM votes GROUP BY person_id HAVING COUNT(*) >= 1
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
