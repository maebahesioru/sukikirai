import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildPersonDat, resolvePeopleThread } from "@/lib/thread2ch";
import { getPerson, postComment } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isValidToken } from "@/lib/validate";
import { to2chResponse } from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

const TEXT_HEADERS = { "Content-Type": "text/plain; charset=utf-8" } as const;

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const raw = key.replace(/\.dat$/i, "").replace(/\/+$/, "");
  const thread = await resolvePeopleThread(raw);
  if (!thread || thread.kind !== "person") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return to2chResponse(await buildPersonDat(thread));
}

export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const raw = key.replace(/\.dat$/i, "").replace(/\/+$/, "");
  const thread = await resolvePeopleThread(raw);
  if (!thread || thread.kind !== "person") {
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
  const name = String(form?.get("NAME") ?? "").trim().slice(0, 40);
  if (!message) {
    return new NextResponse("本文が空です", { status: 400, headers: TEXT_HEADERS });
  }
  if (message.length > 280) {
    return new NextResponse("本文が長すぎます（280文字まで）", { status: 400, headers: TEXT_HEADERS });
  }

  // 専ブラ用の匿名ID（user_token cookie が無ければ発行）
  const cookieHeader = request.headers.get("cookie") ?? "";
  let token = /(?:^|;\s*)user_token=([^;]+)/.exec(cookieHeader)?.[1] ?? "";
  let setCookie: string | null = null;
  if (!isValidToken(token)) {
    token = randomBytes(32).toString("hex");
    setCookie = `user_token=${token}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  const person = await getPerson(thread.id);
  if (!person || person.is_hidden) {
    return new NextResponse("スレッドが見つかりません", { status: 404, headers: TEXT_HEADERS });
  }
  if (person.x_status && person.x_status !== "ok") {
    return new NextResponse(
      "このスレッドは終了しました（アカウントが確認できないため）",
      { status: 403, headers: TEXT_HEADERS }
    );
  }

  // 名前欄に「嫌い」があれば嫌い派、それ以外は好き派として書き込む
  const voteType: "like" | "dislike" = name.includes("嫌い") ? "dislike" : "like";

  const r = await postComment({
    personId: thread.id,
    name: name || null,
    userId: null,
    gender: null,
    ageGroup: null,
    voteType,
    content: message,
    cookieId: token,
    parentCommentId: null,
    ip,
  });
  if (!r.ok) {
    return new NextResponse(r.error, { status: r.status, headers: TEXT_HEADERS });
  }

  const headers: Record<string, string> = {
    ...TEXT_HEADERS,
    Location: `/2ch/people/read.cgi/${raw}`,
  };
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return new NextResponse("書き込みました", { status: 302, headers });
}
