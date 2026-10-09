import { NextResponse } from "next/server";
import { getPerson, getVoteStats, insertVote, tokenIssuedAt, getVoteStreak } from "@/lib/queries";
import { clientIp, rateLimit, allowNewVoter, fpTargetBlocked, markFpTarget, srvTargetBlocked, markSrvTarget } from "@/lib/rate-limit";
import { isValidFp, isValidToken, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personId = str(body.personId, 100);
    const voteType = body.voteType;
    const userToken = body.userToken;
    const fp = isValidFp(body.fp) ? body.fp : null;

    if (!personId || (voteType !== "like" && voteType !== "dislike")) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }
    if (!isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }
    // 発行済みトークンのみ受け付け（偽造トークンでの投票防止）
    const issuedAt = await tokenIssuedAt(userToken);
    if (!issuedAt) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }
    // 直近1時間に発行されたトークンでの対象フラッド制限（mint+use攻撃対策）
    if (issuedAt.getTime() > Date.now() - 60 * 60 * 1000) {
      if (!rateLimit(`freshvote:target:${personId}`, 30, 60 * 1000)) {
        return NextResponse.json(
          { success: false, error: "投票が集中しています。少し時間をおいてお試しください" },
          { status: 429 }
        );
      }
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
    const nv = allowNewVoter(ip, userToken);
    if (!nv.ok) {
      const error =
        nv.reason === "burst"
          ? "短時間に投票が集中しています。しばらく待ってからお試しください"
          : "同一ネットワークからの本日の投票上限に達しました。明日またお試しください";
      return NextResponse.json({ success: false, error }, { status: 429 });
    }

    const person = await getPerson(personId);
    if (!person || person.is_hidden) {
      return NextResponse.json({ success: false, error: "人物が見つかりません" }, { status: 404 });
    }
    // 対象ごとの速度キャップ（スクリプトによる一斉フラッド対策・2026-10-06）
    if (!rateLimit(`vote:target:${person.id}`, 60, 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "投票が集中しています。少し時間をおいてお試しください" },
        { status: 429 }
      );
    }
    if (person.x_status && person.x_status !== "ok") {
      return NextResponse.json({ success: false, error: "投票できません" }, { status: 403 });
    }
    // 端末フィンガープリント対策: cookieを消しても同一端末×同一人物の同日重複投票は不可
    if (fp && fpTargetBlocked(fp, "vote", person.id)) {
      const stats = await getVoteStats(person.id);
      return NextResponse.json(
        {
          success: false,
          error: "今日は既に投票済みです。明日また投票できます。",
          voteType: null,
          ...stats,
          streak: await getVoteStreak(userToken),
        },
        { status: 429 }
      );
    }

    // サーバー側アンカー: (IP, UA) 単位の対象別日次上限（fp偽装・シークレットモード対策・2026-10-09）
    const ua = request.headers.get("user-agent") ?? "";
    if (srvTargetBlocked(ip, ua, "vote", person.id)) {
      return NextResponse.json(
        { success: false, error: "同一ネットワークからの本日の投票上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const r = await insertVote(person.id, voteType, userToken);
    const stats = await getVoteStats(person.id);
    const streak = await getVoteStreak(userToken);
    if (r.ok && fp) markFpTarget(fp, "vote", person.id);
    if (r.ok) markSrvTarget(ip, ua, "vote", person.id);

    if (!r.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "今日は既に投票済みです。明日また投票できます。",
          voteType: r.existing ?? null,
          ...stats,
          streak,
        },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: true, ...stats, streak });
  } catch (e) {
    console.error("vote API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
