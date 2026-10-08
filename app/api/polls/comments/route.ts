import { NextResponse } from "next/server";
import { deletePollCommentByKey, getPollComments, insertPollComment } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { charCount, isValidToken, isUuid, str } from "@/lib/validate";
import { applyTrip } from "@/lib/trip";
import { genDeleteKey, hashDeleteKey } from "@/lib/delete-key";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get("pollId") ?? "";
    if (!pollId) {
      return NextResponse.json({ success: false, error: "pollId required" }, { status: 400 });
    }
    const sort = searchParams.get("sort") === "new" ? "new" : "number";
    const { comments, total } = await getPollComments(pollId, sort);
    return NextResponse.json({ success: true, comments, total });
  } catch (e) {
    console.error("poll comments GET error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const pollId = str(body.pollId, 40);
    const name = applyTrip(body.name ? str(body.name, 64) : null);
    const mail = body.mail ? (str(body.mail, 64).trim() || null) : null;
    const userId = body.userId ? str(body.userId, 50) : null;
    const content = str(body.content, 2000).trim();
    const parentCommentId = body.parentCommentId ? str(body.parentCommentId, 40) : null;
    const userToken = body.userToken;

    if (!isUuid(pollId) || !content || !isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "必須項目が不足しています" }, { status: 400 });
    }
    if (charCount(content) > 280) {
      return NextResponse.json(
        { success: false, error: "コメントは全角140文字（半角280文字）以内です" },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!rateLimit(`pollcomment:ip:${ip}`, 300, 60 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: "投稿が多すぎます" }, { status: 429 });
    }
    if (!rateLimit(`pollcomment:ipday:${ip}`, 2000, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の投稿数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const deleteKey = genDeleteKey();
    const r = await insertPollComment({
      pollId,
      name: name && name.trim() ? name : null,
      userId,
      content,
      parentCommentId,
      cookieId: userToken,
      mail,
      deleteKeyHash: hashDeleteKey(deleteKey),
    });
    if (!r.ok) {
      return NextResponse.json({ success: false, error: r.error }, { status: r.status });
    }
    return NextResponse.json({ success: true, comment: r.comment, deleteKey });
  } catch (e) {
    console.error("poll comments POST error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** 2ch式: 削除キーが一致すれば投票トークのコメントを削除 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = str(body.id, 40);
    const key = str(body.key, 64);
    if (!isUuid(id) || !key) {
      return NextResponse.json({ success: false, error: "削除キーが正しくありません" }, { status: 400 });
    }
    const ip = clientIp(request);
    if (!rateLimit(`polldel:ip:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "試行回数が多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    const ok = await deletePollCommentByKey(id, hashDeleteKey(key));
    if (!ok) {
      return NextResponse.json({ success: false, error: "削除キーが一致しません" }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("poll comments DELETE error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
