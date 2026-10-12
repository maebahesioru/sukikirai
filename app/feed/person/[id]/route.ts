import { NextResponse } from "next/server";
import { getPerson, getComments } from "@/lib/queries";
import { atomFeed, FEED_HEADERS } from "@/lib/feed";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 人物ページのコメントAtomフィード（2026-10-12） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const person = await getPerson(id);
    if (!person || person.is_hidden) {
      return new NextResponse("not found", { status: 404 });
    }
    const { comments } = await getComments(id, { sort: "newest", perPage: 50 });
    const flat = comments
      .flatMap((c) => [c, ...c.replies])
      .sort((a, b) => b.comment_number - a.comment_number)
      .slice(0, 50);
    const xml = atomFeed({
      title: `${person.name} へのコメント | ツイッタラー世論調査`,
      path: `/feed/person/${encodeURIComponent(id)}`,
      entries: flat.map((c) => ({
        title: `#${c.comment_number} ${c.name || "名無しさん"}`,
        link: `${SITE_URL}/person/${encodeURIComponent(id)}#c${c.comment_number}`,
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
