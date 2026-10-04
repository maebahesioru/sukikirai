import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildMetaDat, resolveMetaThread } from "@/lib/thread2ch";
import { insertMetaPost } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidToken } from "@/lib/validate";
import { to2chResponse } from "@/lib/bbs2ch";
import { applyTrip } from "@/lib/trip";

export const dynamic = "force-dynamic";

const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const raw = key.replace(/\.dat$/i, "").replace(/\/+$/, "");
  const thread = resolveMetaThread(raw);
  if (!thread || thread.kind !== "meta") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return to2chResponse(await buildMetaDat());
}

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const raw = key.replace(/\.dat$/i, "").replace(/\/+$/, "");
  const thread = resolveMetaThread(raw);
  if (!thread || thread.kind !== "meta") {
    return new NextResponse("スレッドが見つかりません", { status: 404, headers: TEXT_HEADERS });
  }

  const ip = clientIp(request);
  if (!rateLimit(`write2ch:ip:${ip}`, 20, 10 * 60 * 1000)) {
    return new NextResponse(
      "書き込みが多すぎます。しばらくお待ちください。",
      { status: 429, headers: TEXT_HEADERS }
    );
  }

  const form = await request.formData().catch(() => null);
  const message = String(form?.get("MESSAGE") ?? "").trim();
  const name = applyTrip(String(form?.get("NAME") ?? "").trim().slice(0, 64));
  const mail = String(form?.get("MAIL") ?? "").trim().slice(0, 64) || null;
  if (!message) {
    return new NextResponse("本文が空です", { status: 400, headers: TEXT_HEADERS });
  }
  if (message.length > 280) {
    return new NextResponse("本文が長すぎます（280文字まで）", { status: 400, headers: TEXT_HEADERS });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  let token = /(?:^|;\s*)user_token=([^;]+)/.exec(cookieHeader)?.[1] ?? "";
  let setCookie: string | null = null;
  if (!isValidToken(token)) {
    token = randomBytes(32).toString("hex");
    setCookie = `user_token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  const r = await insertMetaPost({
    name: name || null,
    content: message,
    cookieId: token,
    mail,
  });
  if (!r.ok) {
    return new NextResponse(r.error, { status: r.status, headers: TEXT_HEADERS });
  }

  const headers: Record<string, string> = {
    ...TEXT_HEADERS,
    Location: `/2ch/meta/read.cgi/${raw}`,
  };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new NextResponse("書き込みました", { status: 302, headers });
}
