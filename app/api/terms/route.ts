import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`terms:ip:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json(
      { success: false, error: "リクエストが多すぎます。しばらくお待ちください" },
      { status: 429 }
    );
  }
  const userToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return NextResponse.json({
    success: true,
    userToken,
    expiresAt: expiresAt.toISOString(),
  });
}
