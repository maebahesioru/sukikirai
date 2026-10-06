import { NextResponse } from "next/server";
import { getEvalStats, getMyEvalToday, getPerson, insertEvaluation, tokenIssuedAt } from "@/lib/queries";
import { clientIp, rateLimit, allowNewVoter, fpTargetBlocked, markFpTarget } from "@/lib/rate-limit";
import { isValidFp, isValidToken, str } from "@/lib/validate";
import { EVAL_KEYS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personId = str(body.personId, 100);
    const userToken = body.userToken;
    const fp = isValidFp(body.fp) ? body.fp : null;
    const rawScores = (body.scores ?? {}) as Record<string, unknown>;

    if (!personId || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }
    // 発行済みトークンのみ受け付け（偽造トークン対策）
    const issuedAt = await tokenIssuedAt(userToken);
    if (!issuedAt) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }
    // 直近1時間に発行されたトークンでの対象フラッド制限（mint+use攻撃対策）
    if (issuedAt.getTime() > Date.now() - 60 * 60 * 1000) {
      if (!rateLimit(`fresheval:target:${personId}`, 30, 60 * 1000)) {
        return NextResponse.json(
          { success: false, error: "評価が集中しています。少し時間をおいてお試しください" },
          { status: 429 }
        );
      }
    }

    const ip = clientIp(request);
    if (!rateLimit(`eval:ip:${ip}`, 300, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "リクエストが多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    if (!rateLimit(`eval:ipday:${ip}`, 1000, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の評価数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }
    // cookieリセット連投対策: 同一IPから「新規トークン」で評価できるのは1日 NEW_VOTER_MAX 個まで
    const nv = allowNewVoter(ip, userToken);
    if (!nv.ok) {
      const error =
        nv.reason === "burst"
          ? "短時間に評価が集中しています。しばらく待ってからお試しください"
          : "同一ネットワークからの本日の評価上限に達しました。明日またお試しください";
      return NextResponse.json({ success: false, error }, { status: 429 });
    }

    const scores: Record<string, number | null> = {};
    for (const key of EVAL_KEYS) {
      const v = rawScores[key];
      if (typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5) {
        scores[key] = v;
      }
    }
    if (Object.keys(scores).length === 0) {
      return NextResponse.json(
        { success: false, error: "1項目以上選んでください" },
        { status: 400 }
      );
    }

    const person = await getPerson(personId);
    if (!person || person.is_hidden) {
      return NextResponse.json({ success: false, error: "人物が見つかりません" }, { status: 404 });
    }
    // 対象ごとの速度キャップ（評価フラッド対策・2026-10-06）
    if (!rateLimit(`eval:target:${person.id}`, 60, 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "評価が集中しています。少し時間をおいてお試しください" },
        { status: 429 }
      );
    }
    if (person.x_status && person.x_status !== "ok") {
      return NextResponse.json({ success: false, error: "評価できません" }, { status: 403 });
    }
    // 端末フィンガープリント対策: cookieを消しても同一端末×同一人物の同日重複評価は不可
    if (fp && fpTargetBlocked(fp, "eval", person.id)) {
      const [stats, mine] = await Promise.all([
        getEvalStats(personId),
        getMyEvalToday(personId, userToken),
      ]);
      return NextResponse.json(
        { success: false, error: "今日は既に評価済みです。明日また書き込めます。", stats, mine },
        { status: 409 }
      );
    }

    const r = await insertEvaluation(personId, userToken, scores);
    if (r.ok && fp) markFpTarget(fp, "eval", person.id);
    if (r.ok) {
      const stats = await getEvalStats(personId);
      return NextResponse.json({ success: true, stats, mine: scores });
    }
    if (r.existed) {
      const [stats, mine] = await Promise.all([
        getEvalStats(personId),
        getMyEvalToday(personId, userToken),
      ]);
      return NextResponse.json(
        { success: false, error: "今日は既に評価済みです。明日また書き込めます。", stats, mine },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: "人物が見つかりません" }, { status: 404 });
  } catch (e) {
    console.error("evaluate API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
