import { NextResponse } from "next/server";
import { suggestPeople } from "@/lib/queries";

/** 入力中サジェスト用の軽量検索（最大8件） */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim().slice(0, 60);
    if (!q) {
      return NextResponse.json({ success: true, people: [] });
    }
    const people = await suggestPeople(q, 8);
    return NextResponse.json({ success: true, people });
  } catch {
    return NextResponse.json({ success: false, people: [] }, { status: 500 });
  }
}
