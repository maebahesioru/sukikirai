import { NextResponse } from "next/server";
import { getEvalStats, getMyEvalToday, getPerson, insertEvaluation } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidToken, str } from "@/lib/validate";
import { EVAL_KEYS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personId = str(body.personId, 100);
    const userToken = body.userToken;
    const rawScores = (body.scores ?? {}) as Record<string, unknown>;

    if (!personId || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`eval:ip:${ip}`, 120, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "リクエストが多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
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
    if (person.x_status && person.x_status !== "ok") {
      return NextResponse.json({ success: false, error: "評価できません" }, { status: 403 });
    }

    const r = await insertEvaluation(personId, userToken, scores);
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
