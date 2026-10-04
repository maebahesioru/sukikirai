import { NextResponse } from "next/server";
import { getPerson, getVoteStats, insertVote } from "@/lib/queries";
import { clientIp, rateLimit, allowNewVoter } from "@/lib/rate-limit";
import { isValidToken, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personId = str(body.personId, 100);
    const voteType = body.voteType;
    const userToken = body.userToken;

    if (!personId || (voteType !== "like" && voteType !== "dislike")) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }
    if (!isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`vote:ip:${ip}`, 600, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "リクエストが多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    // トークン回しによる票水増し対策（1日あたりのIP上限）
    if (!rateLimit(`vote:ipday:${ip}`, 1000, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の投票数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }
    // cookieリセット連投対策: 同一IPから「新規トークン」で投票できるのは1日 NEW_VOTER_MAX 個まで
    if (!allowNewVoter(ip, userToken)) {
      return NextResponse.json(
        { success: false, error: "同一ネットワークからの本日の投票上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const person = await getPerson(personId);
    if (!person || person.is_hidden) {
      return NextResponse.json({ success: false, error: "人物が見つかりません" }, { status: 404 });
    }
    if (person.x_status && person.x_status !== "ok") {
      return NextResponse.json({ success: false, error: "投票できません" }, { status: 403 });
    }

    const r = await insertVote(person.id, voteType, userToken);
    const stats = await getVoteStats(person.id);

    if (!r.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "今日は既に投票済みです。明日また投票できます。",
          voteType: r.existing ?? null,
          ...stats,
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: true, ...stats });
  } catch (e) {
    console.error("vote API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
