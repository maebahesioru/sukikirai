import { NextResponse } from "next/server";
import { getPoll, votePoll } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidToken, isUuid, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollId = str(body.pollId, 40);
    const optionId = str(body.optionId, 40);
    const userToken = body.userToken;

    if (!isUuid(pollId) || !isUuid(optionId) || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`pollvote:ip:${ip}`, 600, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "リクエストが多すぎます" }, { status: 429 });
    }
    if (!rateLimit(`pollvote:ipday:${ip}`, 1000, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の投票数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const r = await votePoll(pollId, optionId, userToken);
    const poll = await getPoll(pollId);
    if (!r.ok) {
      return NextResponse.json(
        {
          success: false,
          error: r.error,
          currentOptionId: r.currentOptionId ?? null,
          options: poll?.options ?? [],
        },
        { status: r.status }
      );
    }
    return NextResponse.json({ success: true, options: poll?.options ?? [] });
  } catch (e) {
    console.error("poll vote error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
