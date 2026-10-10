import { NextResponse } from "next/server";
import { registerToken } from "@/lib/queries";
import { randomBytes } from "crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  // キャリアNATでIP共有されるモバイル対策: 端末(IP+UA)単位の制限＋IPは緩いバックストップ（2026-10-10）
  const ua = request.headers.get("user-agent") ?? "";
  if (
    !rateLimit(`terms:ipua:${ip}:${ua}`, 20, 60 * 60 * 1000) ||
    !rateLimit(`terms:ipuaday:${ip}:${ua}`, 100, 24 * 60 * 60 * 1000) ||
    !rateLimit(`terms:ip:${ip}`, 400, 60 * 60 * 1000) ||
    !rateLimit(`terms:ipday:${ip}`, 5000, 24 * 60 * 60 * 1000)
  ) {
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
