import { NextResponse } from "next/server";
import { createPoll } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidToken, str } from "@/lib/validate";
import { isSpamContent } from "@/lib/spam-filter";
import type { PollType } from "@/lib/types";

const TYPES: PollType[] = ["two_choice", "three_plus_fixed", "three_plus_open"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = str(body.title, 200).trim();
    const description = body.description ? str(body.description, 500).trim() : null;
    const pollType = body.pollType as PollType;
    // options: [{ text, imageUrl }]（文字列も後方互換で受ける）
    const rawOptions: unknown[] = Array.isArray(body.options) ? body.options : [];
    const options = rawOptions
      .map((o) => {
        if (typeof o === "string") return { text: str(o, 100).trim(), imageUrl: null as string | null };
        const obj = o as { text?: unknown; imageUrl?: unknown };
        const text = str(obj?.text, 100).trim();
        const rawUrl = obj?.imageUrl ? str(obj.imageUrl, 500).trim() : "";
        const imageUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
        return { text, imageUrl };
      })
      .filter((o) => o.text)
      .slice(0, 10);
    const relatedPersonIds = Array.isArray(body.relatedPersonIds)
      ? body.relatedPersonIds.filter((v: unknown) => typeof v === "string").slice(0, 5)
      : [];
    const userToken = body.userToken;

    if (!title || !TYPES.includes(pollType) || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "必須項目が不足しています" }, { status: 400 });
    }
    if (pollType === "two_choice" && options.length !== 2) {
      return NextResponse.json({ success: false, error: "2択の場合は選択肢を2つ指定してください" }, { status: 400 });
    }
    if (pollType !== "two_choice" && options.length < 3) {
      return NextResponse.json({ success: false, error: "3択以上の場合は選択肢を3つ以上入力してください" }, { status: 400 });
    }
    const titleSpam = isSpamContent(title);
    if (titleSpam.isSpam) {
      return NextResponse.json(
        { success: false, error: `タイトルに不適切な内容が含まれています: ${titleSpam.reason}` },
        { status: 400 }
      );
    }
    for (const o of options) {
      const s = isSpamContent(o.text);
      if (s.isSpam) {
        return NextResponse.json(
          { success: false, error: `選択肢に不適切な内容が含まれています: ${s.reason}` },
          { status: 400 }
        );
      }
    }

    const ip = clientIp(request);
    if (!rateLimit(`poll:ip:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "作成リクエストが多すぎます" }, { status: 429 });
    }
    if (!rateLimit(`poll:token:${userToken}`, 6, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "1時間に作成できる投票は6つまでです" }, { status: 429 });
    }

    const pollId = await createPoll({
      title,
      description,
      pollType,
      options,
      relatedPersonIds,
      creatorCookieId: userToken,
    });
    return NextResponse.json({ success: true, pollId });
  } catch (e) {
    console.error("poll create error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
