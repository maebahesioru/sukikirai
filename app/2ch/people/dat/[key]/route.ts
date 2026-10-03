import { NextResponse } from "next/server";
import { getPersonCommentsFor2ch, listPeopleFor2ch } from "@/lib/queries";
import {
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
  const rows = await listPeopleFor2ch();
  const keys = assignThreadKeys(rows);
  const thread = rows.find((r) => keys.get(r.id) === raw);
  if (!thread) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const title = sanitizeField(`${thread.name}の評価・好き嫌い`, 120);
  const comments = await getPersonCommentsFor2ch(thread.id);
  const lines = comments.map((c) => {
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
  return to2chResponse(lines.length ? lines.join("\n") + "\n" : "");
}
