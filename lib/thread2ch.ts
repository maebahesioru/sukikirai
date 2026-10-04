// 2ch互換: スレッドキー解決とdat生成の共通ロジック（dat / read.cgi 両ルートで使用）
import {
  getMetaPostsFor2ch,
  getPersonCommentsFor2ch,
  getPollCommentsFor2ch,
  listPeopleFor2ch,
  listPollsFor2ch,
} from "./queries";
import { META_THREAD } from "./constants";
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
  | { kind: "poll"; id: string; title: string; createdAt: string }
  | { kind: "meta"; id: string; title: string; createdAt: string };

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

/** 管理スレのスレキー（作成時刻のepoch秒・固定） */
export function metaThreadKey(): string {
  return String(Math.floor(new Date(META_THREAD.createdAt).getTime() / 1000));
}

/** キーから管理スレを解決（単一固定スレッド） */
export function resolveMetaThread(rawKey: string): ResolvedThread | null {
  if (rawKey !== metaThreadKey()) return null;
  return {
    kind: "meta",
    id: META_THREAD.id,
    title: META_THREAD.title,
    createdAt: META_THREAD.createdAt,
  };
}

/** スレ先頭のOP行（>>1）。2chでは全スレに必ず存在する。
 *  ⚠️ コメント0件のときだけ出す「仮OP」ではない: Siki等の専ブラは新着を
 *  「dat行数-1（OPを除いたレス数）」の増分で検知するため、OPは常に行1として
 *  置き続ける必要がある（初コメントで行数が増えず通知が漏れるバグの修正）。 */
export function buildOpLine(
  kind: "person" | "poll" | "meta",
  label: string,
  title: string,
  createdAt: string,
  threadId: string
): string {
  const body =
    kind === "person"
      ? `「${label}」の評価・好き嫌いスレッドです。好き派・嫌い派を書き込めます。`
      : kind === "poll"
        ? `「${label}」の投票トークです。選択肢への投票とコメントができます。`
        : `ツイッタラー世論調査への要望・バグ報告・その他を書き込むスレッドです。運営が確認します。`;
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
  // 行1 = OP（固定）、行2以降 = コメント。専ブラの新着検知は行数-1で数えるため
  // OPを常に先頭に置く（空スレの仮OPはそのまま初コメント後もOPとして残る）
  const op = buildOpLine("person", thread.name, title, thread.createdAt ?? "", thread.id);
  return op + (lines.length ? lines.join("\n") + "\n" : "");
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
  // 行1 = OP（固定）、行2以降 = コメント（人物スレと同じ理由）
  const op = buildOpLine("poll", thread.title, title, thread.createdAt ?? "", thread.id);
  return op + (lines.length ? lines.join("\n") + "\n" : "");
}

/** 管理スレのdat本文を組み立てる（dat / read.cgi GET 共通） */
export async function buildMetaDat(): Promise<string> {
  const title = sanitizeField(META_THREAD.title, 120);
  const posts = await getMetaPostsFor2ch();
  const lines = posts.map((p) => {
    if (p.is_hidden) return ABONE;
    const base = p.name ? sanitizeField(p.name, 40) : NONAME;
    return datLine(
      base,
      fmt2chDate(p.created_at),
      anonId(p.cookie_id, p.id),
      esc2ch(p.content),
      title,
      sanitizeField(p.mail ?? "", 64)
    );
  });
  const op = buildOpLine("meta", META_THREAD.title, title, META_THREAD.createdAt, META_THREAD.id);
  return op + (lines.length ? lines.join("\n") + "\n" : "");
}
