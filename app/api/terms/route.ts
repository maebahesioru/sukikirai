import { NextResponse } from "next/server";
import { registerToken } from "@/lib/queries";
import { randomBytes } from "crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`terms:ip:${ip}`, 30, 60 * 60 * 1000) || !rateLimit(`terms:ipday:${ip}`, 100, 24 * 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "リクエストが多すぎます。しばらくお待ちください" },
      { status: 429 }
    );
  }
  const userToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  try {
    await registerToken(userToken, expiresAt);
  } catch {
    /* 登録失敗時もトークンは返す（投票時に弾かれる可能性はあるがUX優先） */
  }
  return NextResponse.json({
    success: true,
    userToken,
    expiresAt: expiresAt.toISOString(),
  });
}
