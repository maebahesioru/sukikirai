import { NextResponse } from "next/server";
import { getSquidState } from "@/lib/squid-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getSquidState();
    return NextResponse.json({ success: true, ...state });
  } catch (e) {
    console.error("squid state GET error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
