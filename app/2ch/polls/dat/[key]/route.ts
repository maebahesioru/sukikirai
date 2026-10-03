import { NextResponse } from "next/server";
import { getPollCommentsFor2ch, listPollsFor2ch } from "@/lib/queries";
import { buildOpLine } from "@/lib/thread2ch";
import {
  ABONE,
  NONAME,
  anonId,
  assignThreadKeys,
  datLine,
  esc2ch,
  fmt2chDate,
  sanitizeField,
  to2chResponse,
} from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const raw = key.replace(/\.dat$/i, "");
  const rows = await listPollsFor2ch();
  const keys = assignThreadKeys(rows);
  const thread = rows.find((r) => keys.get(r.id) === raw);
  if (!thread) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
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
  const out = lines.length
    ? lines.join("\n") + "\n"
    : buildOpLine("poll", thread.title, title, thread.created_at, thread.id);
  return to2chResponse(out);
}
