import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAnalytics } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ success: false, error: "Invalid date" }, { status: 400 });
    }
    const data = await getAnalytics(date);
    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    console.error("analytics API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
