import { NextResponse } from "next/server";
import { searchPeople } from "@/lib/queries";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    if (!q) {
      return NextResponse.json({ success: true, people: [] });
    }
    const people = await searchPeople(q, 30);
    return NextResponse.json({
      success: true,
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        handle: p.handle,
        avatar_url: p.avatar_url,
        category: p.category,
        likes: p.likes,
        dislikes: p.dislikes,
      })),
    });
  } catch (e) {
    console.error("people search error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
