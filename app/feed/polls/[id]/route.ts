import { NextResponse } from "next/server";
import { getPoll, getPollComments } from "@/lib/queries";
import { atomFeed, FEED_HEADERS } from "@/lib/feed";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 投票ページのコメントAtomフィード（2026-10-12） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const poll = await getPoll(id);
    if (!poll) {
      return new NextResponse("not found", { status: 404 });
    }
    const { comments } = await getPollComments(id, "new");
    const flat = comments
      .flatMap((c) => [c, ...c.replies])
      .sort((a, b) => b.comment_number - a.comment_number)
      .slice(0, 50);
    const xml = atomFeed({
      title: `${poll.title} へのコメント | ツイッタラー世論調査`,
      path: `/feed/polls/${id}`,
      entries: flat.map((c) => ({
        title: `#${c.comment_number} ${c.name || "名無しさん"}`,
        link: `${SITE_URL}/polls/${id}#c${c.comment_number}`,
        updated: new Date(c.created_at).toISOString(),
        author: c.name || "名無しさん",
        content: c.content,
      })),
    });
    return new NextResponse(xml, { headers: FEED_HEADERS });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
