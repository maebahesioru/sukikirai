import { NextResponse } from "next/server";
import { getPoll, votePoll, isKnownToken } from "@/lib/queries";
import { clientIp, rateLimit, allowNewVoter, fpTargetBlocked, markFpTarget } from "@/lib/rate-limit";
import { isValidFp, isValidToken, isUuid, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollId = str(body.pollId, 40);
    const optionId = str(body.optionId, 40);
    const userToken = body.userToken;
    const fp = isValidFp(body.fp) ? body.fp : null;

    if (!isUuid(pollId) || !isUuid(optionId) || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }
    // 発行済みトークンのみ受け付け（偽造トークン対策）
    if (!(await isKnownToken(userToken))) {
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
    // cookieリセット連投対策: 同一IPから「新規トークン」で投票できるのは1日 NEW_VOTER_MAX 個まで
    const nv = allowNewVoter(ip, userToken);
    if (!nv.ok) {
      const error =
        nv.reason === "burst"
          ? "短時間に投票が集中しています。しばらく待ってからお試しください"
          : "同一ネットワークからの本日の投票上限に達しました。明日またお試しください";
      return NextResponse.json({ success: false, error }, { status: 429 });
    }

    // 端末フィンガープリント対策: cookieを消しても同一端末×同一投票の重複投票は不可
    if (fp && fpTargetBlocked(fp, "pollvote", pollId)) {
      const poll = await getPoll(pollId);
      return NextResponse.json(
        { success: false, error: "既に投票済みです", options: poll?.options ?? [] },
        { status: 429 }
      );
    }

    const r = await votePoll(pollId, optionId, userToken);
    if (r.ok && fp) markFpTarget(fp, "pollvote", pollId);
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
