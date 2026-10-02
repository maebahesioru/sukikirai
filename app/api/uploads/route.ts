import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { insertPollUpload } from "@/lib/queries";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

/** マジックバイトで画像形式を判定（SVG等の能動コンテンツは不可） */
function sniffMime(b: Buffer): string | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  const g = b.toString("ascii", 0, 6);
  if (g === "GIF87a" || g === "GIF89a") return "image/gif";
  return null;
}

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    if (!rateLimit(`upload:ip:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "アップロードが多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    if (!rateLimit(`upload:ipday:${ip}`, 300, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日のアップロード数が上限に達しました" },
        { status: 429 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "ファイルがありません" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { success: false, error: "画像は5MBまでアップロードできます" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = sniffMime(buf);
    if (!mime) {
      return NextResponse.json(
        { success: false, error: "PNG / JPEG / WebP / GIF のみアップロードできます" },
        { status: 400 }
      );
    }

    const id = await insertPollUpload(mime, buf.length, buf);
    return NextResponse.json({ success: true, url: `/api/uploads/${id}` });
  } catch {
    return NextResponse.json(
      { success: false, error: "アップロードに失敗しました" },
      { status: 500 }
    );
  }
}
