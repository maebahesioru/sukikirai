import { NextResponse } from "next/server";
import { insertReport } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isUuid, str } from "@/lib/validate";
import { REPORT_REASONS } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const commentId = str(body.commentId, 40);
    const reason = str(body.reason, 100);
    const details = body.details ? str(body.details, 500) : null;

    if (!isUuid(commentId) || !(REPORT_REASONS as readonly string[]).includes(reason)) {
      return NextResponse.json({ success: false, error: "パラメータが不正です" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`report:ip:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "通報が多すぎます。しばらくお待ちください" }, { status: 429 });
    }

    const ok = await insertReport(commentId, reason, details);
    if (!ok) {
      return NextResponse.json({ success: false, error: "コメントが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("report API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
