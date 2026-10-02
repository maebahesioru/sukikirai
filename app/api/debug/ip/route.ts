import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// レート制限のIP判定が正しいか確認するための診断エンドポイント（管理者のみ）
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const h = req.headers;
  return NextResponse.json({
    clientIpUsed: clientIp(req),
    cfConnectingIp: h.get("cf-connecting-ip"),
    xForwardedFor: h.get("x-forwarded-for"),
    xRealIp: h.get("x-real-ip"),
    cfRay: h.get("cf-ray") ? "present" : null,
    xForwardedProto: h.get("x-forwarded-proto"),
    via: h.get("via"),
  });
}
