import { NextResponse } from "next/server";
import { getMetaPosts } from "@/lib/queries";
import { atomFeed, FEED_HEADERS } from "@/lib/feed";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** 管理スレのAtomフィード（2026-10-12） */
export async function GET() {
  try {
    const posts = await getMetaPosts(500);
    const flat = posts
      .flatMap((p) => [p, ...p.replies])
      .sort((a, b) => b.post_number - a.post_number)
      .slice(0, 50);
    const xml = atomFeed({
      title: "管理スレ | ツイッタラー世論調査",
      path: "/feed/meta",
      entries: flat.map((p) => ({
        title: `#${p.post_number} ${p.name ?? "名無しさん"}`,
        link: `${SITE_URL}/meta#c${p.post_number}`,
        updated: new Date(p.created_at).toISOString(),
        author: p.name ?? "名無しさん",
        content: p.content,
      })),
    });
    return new NextResponse(xml, { headers: FEED_HEADERS });
  } catch {
    return new NextResponse("Internal server error", { status: 500 });
  }
}
