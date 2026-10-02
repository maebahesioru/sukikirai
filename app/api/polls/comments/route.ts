import { NextResponse } from "next/server";
import { getPollComments, insertPollComment } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { charCount, isValidToken, isUuid, str } from "@/lib/validate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get("pollId") ?? "";
    if (!pollId) {
      return NextResponse.json({ success: false, error: "pollId required" }, { status: 400 });
    }
    const sort = searchParams.get("sort") === "new" ? "new" : "number";
    const { comments, total } = await getPollComments(pollId, sort);
    return NextResponse.json({ success: true, comments, total });
  } catch (e) {
    console.error("poll comments GET error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollId = str(body.pollId, 40);
    const name = body.name ? str(body.name, 50) : null;
    const userId = body.userId ? str(body.userId, 50) : null;
    const content = str(body.content, 2000).trim();
    const parentCommentId = body.parentCommentId ? str(body.parentCommentId, 40) : null;
    const userToken = body.userToken;

    if (!isUuid(pollId) || !content || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "必須項目が不足しています" }, { status: 400 });
    }
    if (charCount(content) > 280) {
      return NextResponse.json(
        { success: false, error: "コメントは全角140文字（半角280文字）以内です" },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!rateLimit(`pollcomment:ip:${ip}`, 40, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "投稿が多すぎます" }, { status: 429 });
    }
    if (!rateLimit(`pollcomment:ipday:${ip}`, 100, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の投稿数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const r = await insertPollComment({
      pollId,
      name: name && name.trim() ? name : null,
      userId,
      content,
      parentCommentId,
      cookieId: userToken,
    });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error }, { status: r.status });
    }
    return NextResponse.json({ success: true, comment: r.comment });
  } catch (e) {
    console.error("poll comments POST error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
