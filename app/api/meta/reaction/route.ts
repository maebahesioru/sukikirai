import { NextResponse } from "next/server";
import { toggleMetaReaction } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid, str } from "@/lib/validate";

/** 管理スレ投稿の good/bad リアクション（コメント板と同じ・2026-10-12） */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const postId = str(body.postId, 40);
    const reactionType = body.reactionType;
    const userToken = typeof body.userToken === "string" ? body.userToken : "";

    if (!isUuid(postId) || (reactionType !== "good" && reactionType !== "bad")) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`reaction:ip:${ip}`, 1200, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "リクエストが多すぎます" }, { status: 429 });
    }

    const cookieId = /^[a-f0-9]{64}$/i.test(userToken) ? userToken : "";
    const result = await toggleMetaReaction(postId, reactionType, cookieId);
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("meta reaction API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
