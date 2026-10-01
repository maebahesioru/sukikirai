import { NextResponse } from "next/server";
import { insertPollReport } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid, isValidToken, str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollCommentId = str(body.pollCommentId, 40);
    const reason = body.reason ? str(body.reason, 100) : null;
    const details = body.details ? str(body.details, 500) : null;

    if (!isUuid(pollCommentId) || !isValidToken(body.userToken)) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`pollreport:ip:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "通報が多すぎます" }, { status: 429 });
    }

    const r = await insertPollReport({ pollCommentId, reason, details });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error }, { status: r.status });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("poll report error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
