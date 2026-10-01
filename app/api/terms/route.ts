import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST() {
  const userToken = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  return NextResponse.json({
    success: true,
    userToken,
    expiresAt: expiresAt.toISOString(),
  });
}
