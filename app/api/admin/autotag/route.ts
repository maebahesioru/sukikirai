import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { retagEveryone } from "@/lib/autotag";

/** 全員（またはタグ空の人）のタグを辞書+自動昇格で再判定して保存 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const mode = body?.mode === "empty" ? "empty" : "all";
    const r = await retagEveryone(mode);
    return NextResponse.json({ success: true, mode, ...r });
  } catch (e) {
    console.error("admin autotag error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
