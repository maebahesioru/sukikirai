import { NextResponse } from "next/server";
import { checkPollVote } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get("pollId") ?? "";
    const userToken = searchParams.get("userToken") ?? "";
    if (!pollId) {
      return NextResponse.json({ success: false, error: "pollId required" }, { status: 400 });
    }
    const r = await checkPollVote(pollId, userToken);
    return NextResponse.json({ success: true, ...r });
  } catch (e) {
    console.error("poll check-vote error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
