import { NextResponse } from "next/server";
import { addPersonFromX } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { str } from "@/lib/validate";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = str(body.query, 60).trim();
    if (!query) {
      return NextResponse.json({ success: false, error: "検索ワードを入力してください" }, { status: 400 });
    }

    const ip = clientIp(request);
    if (!rateLimit(`resolve:ip:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "追加リクエストが多すぎます。1時間ほどおいてからお試しください" },
        { status: 429 }
      );
    }
    if (!rateLimit(`resolve-fast:ip:${ip}`, 1, 3000)) {
      return NextResponse.json(
        { success: false, error: "少し待ってからもう一度お試しください" },
        { status: 429 }
      );
    }

    const result = await addPersonFromX(query);
    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      success: true,
      created: result.created,
      person: {
        id: result.person.id,
        name: result.person.name,
        handle: result.person.handle,
        avatar_url: result.person.avatar_url,
      },
    });
  } catch (e) {
    console.error("resolve API error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
