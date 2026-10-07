import { NextResponse } from "next/server";
import { getEmbed } from "@/lib/link-embed";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`embed:ip:${ip}`, 120, 60 * 60 * 1000)) {
    return NextResponse.json({ success: false, error: "rate limited" }, { status: 429 });
  }
  const raw = new URL(request.url).searchParams.get("url") ?? "";
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url) || url.length > 500) {
    return NextResponse.json({ success: false, error: "invalid url" }, { status: 400 });
  }
  const embed = await getEmbed(url);
  return NextResponse.json(
    { success: !!embed, embed },
    { headers: { "Cache-Control": "public, max-age=600" } }
  );
}
