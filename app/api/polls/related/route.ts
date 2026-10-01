import { NextResponse } from "next/server";
import { getRelatedPolls } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId") ?? "";
    if (!personId) {
      return NextResponse.json({ success: false, error: "personId required" }, { status: 400 });
    }
    const polls = await getRelatedPolls(personId);
    return NextResponse.json({ success: true, polls });
  } catch (e) {
    console.error("poll related error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
