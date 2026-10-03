// 2ch互換: スレッドキー解決とdat生成の共通ロジック（dat / read.cgi 両ルートで使用）
import {
  getPersonCommentsFor2ch,
  getPollCommentsFor2ch,
  listPeopleFor2ch,
  listPollsFor2ch,
} from "./queries";
import {
  ABONE,
  NONAME,
  anonId,
  assignThreadKeys,
  datLine,
  esc2ch,
  fmt2chDate,
  sanitizeField,
} from "./bbs2ch";

export type ResolvedThread =
  | { kind: "person"; id: string; name: string; createdAt: string }
  | { kind: "poll"; id: string; title: string; createdAt: string };

/** キー（10桁数字）から人物スレを解決 */
export async function resolvePeopleThread(rawKey: string): Promise<ResolvedThread | null> {
  const rows = await listPeopleFor2ch();
  const keys = assignThreadKeys(rows);
  const t = rows.find((r) => keys.get(r.id) === rawKey);
  return t ? { kind: "person", id: t.id, name: t.name, createdAt: t.created_at } : null;
}

/** キー（10桁数字）から投票トークスレを解決 */
export async function resolvePollThread(rawKey: string): Promise<ResolvedThread | null> {
  const rows = await listPollsFor2ch();
  const keys = assignThreadKeys(rows);
  const t = rows.find((r) => keys.get(r.id) === rawKey);
  return t ? { kind: "poll", id: t.id, title: t.title, createdAt: t.created_at } : null;
}

/** コメント0件のスレに置く仮OP行（datを空にしない。2chではスレに必ず>>1が存在する） */
export function buildOpLine(
  kind: "person" | "poll",
  label: string,
  title: string,
  createdAt: string,
  threadId: string
): string {
  const body =
    kind === "person"
      ? `「${label}」の評価・好き嫌いスレッドです。好き派・嫌い派を書き込めます。`
      : `「${label}」の投票トークです。選択肢への投票とコメントができます。`;
  return (
    datLine(
      NONAME,
      fmt2chDate(createdAt || new Date().toISOString()),
      anonId(null, threadId),
      sanitizeField(body, 300),
      title
    ) + "\n"
  );
}

/** 人物スレのdat本文を組み立てる（dat / read.cgi GET 共通） */
export async function buildPersonDat(thread: {
  id: string;
  name: string;
  createdAt?: string;
}): Promise<string> {
  const title = sanitizeField(`${thread.name}の評価・好き嫌い`, 120);
  const comments = await getPersonCommentsFor2ch(thread.id);
  const lines = comments.map((c) => {
    if (c.is_hidden) return ABONE;
    const tag = c.vote_type === "like" ? "好き派" : "嫌い派";
    const base = c.name ? sanitizeField(c.name, 40) : NONAME;
    return datLine(
      `${base}(${tag})`,
      fmt2chDate(c.created_at),
      anonId(c.cookie_id, c.id),
      esc2ch(c.content),
      title,
      sanitizeField(c.mail ?? "", 64)
    );
  });
  if (lines.length === 0) {
    return buildOpLine("person", thread.name, title, thread.createdAt ?? "", thread.id);
  }
  return lines.join("\n") + "\n";
}

/** 投票トークスレのdat本文を組み立てる */
export async function buildPollDat(thread: {
  id: string;
  title: string;
  createdAt?: string;
}): Promise<string> {
  const title = sanitizeField(thread.title, 120);
  const comments = await getPollCommentsFor2ch(thread.id);
  const lines = comments.map((c) => {
    if (c.is_hidden) return ABONE;
    const base = c.name ? sanitizeField(c.name, 40) : NONAME;
    const body = c.voted_option
      ? `「${sanitizeField(c.voted_option, 60)}」に投票しました！<br><br>${esc2ch(c.content)}`
      : esc2ch(c.content);
    return datLine(
      base,
      fmt2chDate(c.created_at),
      anonId(c.cookie_id, c.id),
      body,
      title,
      sanitizeField(c.mail ?? "", 64)
    );
  });
  if (lines.length === 0) {
    return buildOpLine("poll", thread.title, title, thread.createdAt ?? "", thread.id);
  }
  return lines.join("\n") + "\n";
}
