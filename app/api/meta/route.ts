import { NextResponse } from "next/server";
import { getMetaPosts, insertMetaPost } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { charCount, isValidToken, str } from "@/lib/validate";
import { MAX_COMMENT_CHARS } from "@/lib/constants";
import { applyTrip } from "@/lib/trip";

export async function GET() {
  try {
    const posts = await getMetaPosts();
    return NextResponse.json({ success: true, posts });
  } catch (e) {
    console.error("meta GET error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = applyTrip(body.name ? str(body.name, 64) : null);
    const mail = body.mail ? (str(body.mail, 64).trim() || null) : null;
    const content = str(body.content, 2000).trim();
    const userToken = body.userToken;

    if (!content) {
      return NextResponse.json({ success: false, error: "本文を入力してください" }, { status: 400 });
    }
    if (!isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }
    if (charCount(content) > MAX_COMMENT_CHARS) {
      return NextResponse.json(
        { success: false, error: `本文は全角${Math.floor(MAX_COMMENT_CHARS / 2)}文字（半角${MAX_COMMENT_CHARS}文字）以内です` },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!rateLimit(`meta:ip:${ip}`, 300, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "投稿が多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    if (!rateLimit(`meta:ipday:${ip}`, 2000, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の投稿数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const result = await insertMetaPost({
      name: name && name.trim() ? name : null,
      content,
      cookieId: userToken,
      mail,
    });
    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, post: result.post });
  } catch (e) {
    console.error("meta POST error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
