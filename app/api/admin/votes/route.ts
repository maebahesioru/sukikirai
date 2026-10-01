import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { adminSetVotes, getVoteStats } from "@/lib/queries";
import { str } from "@/lib/validate";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const personId = str(body.personId, 100).trim();
    const likes = Number(body.likes);
    const dislikes = Number(body.dislikes);

    if (
      !personId ||
      !Number.isInteger(likes) ||
      !Number.isInteger(dislikes) ||
      likes < 0 ||
      dislikes < 0 ||
      likes > 100000 ||
      dislikes > 100000
    ) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    await adminSetVotes(personId, likes, dislikes);
    const stats = await getVoteStats(personId);
    return NextResponse.json({ success: true, ...stats });
  } catch (e) {
    console.error("admin votes error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
