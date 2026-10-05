import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { sql } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** 自前ホストのNLLB翻訳サービス（VM100 CPU・24/7） */
const TRANSLATE_SERVICE_URL =
  process.env.TRANSLATE_SERVICE_URL || "http://192.168.1.73:5100/translate";

const TARGETS = ["en", "zh-Hans", "zh-Hant", "ko", "es", "fr"];

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`translate:${ip}`, 120, 10 * 60 * 1000)) {
    return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
  }

  let body: { text?: unknown; to?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "bad_json" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const to = typeof body.to === "string" ? body.to : "";
  if (!text || text.length > 2000 || !TARGETS.includes(to)) {
    return NextResponse.json({ success: false, error: "invalid" }, { status: 400 });
  }

  const hash = createHash("sha256").update(text).digest("hex");

  // キャッシュ
  try {
    const rows = await sql<{ result: string }>(
      `SELECT result FROM translations WHERE text_hash = $1 AND target = $2`,
      [hash, to]
    );
    if (rows[0]) {
      return NextResponse.json({ success: true, result: rows[0].result, cached: true });
    }
  } catch {
    /* キャッシュ読取失敗は無視して翻訳へ */
  }

  // 翻訳サービス呼び出し
  try {
    const res = await fetch(TRANSLATE_SERVICE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, to }),
      signal: AbortSignal.timeout(25000),
    });
    const data = (await res.json()) as { success?: boolean; result?: string };
    if (!res.ok || !data.success || typeof data.result !== "string") {
      throw new Error("service_error");
    }
    try {
      await sql(
        `INSERT INTO translations (text_hash, target, source_text, result) VALUES ($1, $2, $3, $4)
         ON CONFLICT (text_hash, target) DO NOTHING`,
        [hash, to, text.slice(0, 2000), data.result.slice(0, 8000)]
      );
    } catch {
      /* キャッシュ保存失敗は無視 */
    }
    return NextResponse.json({ success: true, result: data.result, cached: false });
  } catch {
    return NextResponse.json({ success: false, error: "translate_failed" }, { status: 502 });
  }
}
