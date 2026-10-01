import { NextResponse } from "next/server";
import { addPollOption } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidToken, isUuid, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollId = str(body.pollId, 40);
    const optionText = str(body.optionText, 100).trim();
    const rawUrl = body.imageUrl ? str(body.imageUrl, 500).trim() : "";
    const imageUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : null;
    const userToken = body.userToken;

    if (!isUuid(pollId) || !optionText || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "必須項目が不足しています" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`pollopt:ip:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "リクエストが多すぎます" }, { status: 429 });
    }

    const r = await addPollOption(pollId, optionText, imageUrl, userToken);
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error }, { status: r.status });
    }
    return NextResponse.json({ success: true, option: r.option });
  } catch (e) {
    console.error("poll add-option error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
