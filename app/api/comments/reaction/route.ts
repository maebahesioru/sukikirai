import { NextResponse } from "next/server";
import { toggleReaction } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const commentId = str(body.commentId, 40);
    const reactionType = body.reactionType;
    const userToken = typeof body.userToken === "string" ? body.userToken : "";

    if (!isUuid(commentId) || (reactionType !== "good" && reactionType !== "bad")) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`reaction:ip:${ip}`, 400, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "リクエストが多すぎます" }, { status: 429 });
    }

    const cookieId = /^[a-f0-9]{64}$/i.test(userToken) ? userToken : "";
    const result = await toggleReaction(commentId, reactionType, cookieId);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("reaction API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
