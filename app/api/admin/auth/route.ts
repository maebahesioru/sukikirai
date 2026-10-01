import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, checkAdminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = typeof body.password === "string" ? body.password : "";
    if (!checkAdminPassword(password)) {
      return NextResponse.json({ success: false, error: "パスワードが違います" }, { status: 401 });
    }
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      // 本番はSecure。ローカル検証時のみ ALLOW_INSECURE_COOKIES=1 で解除
      secure: process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "1",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
