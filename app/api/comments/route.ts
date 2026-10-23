import { NextResponse } from "next/server";
import { deleteCommentByKey, getComments, getRecentReplies, postComment, tokenIssuedAt } from "@/lib/queries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { charCount, isUuid, isValidToken, str } from "@/lib/validate";
import { AGE_GROUPS, GENDERS, MAX_COMMENT_CHARS } from "@/lib/constants";
import { applyTrip } from "@/lib/trip";
import { genDeleteKey, hashDeleteKey } from "@/lib/delete-key";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const personId = searchParams.get("personId") ?? "";
    const filterRaw = searchParams.get("filter");
    const sortRaw = searchParams.get("sort");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const q = (searchParams.get("q") ?? "").trim().slice(0, 100);

    if (!personId) {
      return NextResponse.json({ success: false, error: "personId required" }, { status: 400 });
    }
    const filter = filterRaw === "like" || filterRaw === "dislike" ? filterRaw : "all";
    const sort = sortRaw === "popular" ? "popular" : "newest";

    const { comments, total } = await getComments(personId, { filter, sort, page, q: q || undefined });
    // 過去スレへの新着レス（1ページ目・フィルタなし時のみ）— 2026-10-18
    const recentReplies =
      page === 1 && filter === "all" && sort === "newest" && !q
        ? await getRecentReplies(personId)
        : [];
    return NextResponse.json({ success: true, comments, total, recentReplies });
  } catch (e) {
    console.error("comments GET error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const personId = str(body.personId, 100);
    const name = applyTrip(body.name ? str(body.name, 64) : null);
    const mail = body.mail ? (str(body.mail, 64).trim() || null) : null;
    const userId = body.userId ? str(body.userId, 50) : null;
    const gender = GENDERS.includes(body.gender) ? (body.gender as string) : null;
    const ageGroup = AGE_GROUPS.includes(body.ageGroup) ? (body.ageGroup as string) : null;
    const voteType = body.voteType;
    const content = str(body.content, 2000).trim();
    const parentCommentId = body.parentCommentId ? str(body.parentCommentId, 40) : null;
    const userToken = body.userToken;

    if (!personId || !content || (voteType !== "like" && voteType !== "dislike")) {
      return NextResponse.json({ success: false, error: "必須項目が不足しています" }, { status: 400 });
    }
    if (!isValidToken(userToken)) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }
    // 発行済みトークンのみ受け付け（偽造トークンでの連投回避・投票と同水準 — 2026-10-14）
    const issuedAt = await tokenIssuedAt(userToken);
    if (!issuedAt) {
      return NextResponse.json({ success: false, error: "Invalid user token" }, { status: 400 });
    }
    // 直近1時間に発行されたトークンでの対象フラッド制限（mint+use攻撃対策）
    if (issuedAt.getTime() > Date.now() - 60 * 60 * 1000) {
      if (!rateLimit(`freshcomment:target:${personId}`, 30, 60 * 1000)) {
        return NextResponse.json(
          { success: false, error: "コメントが集中しています。少し時間をおいてお試しください" },
          { status: 429 }
        );
      }
    }
    // 同一クッキー（=同一トークン）から同一人物への連投制限: 10分で5件まで — 2026-10-23
    if (!rateLimit(`comment:ck:${userToken}:${personId}`, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "同じページへの投稿が続いています。少し時間をおいてお試しください" },
        { status: 429 }
      );
    }
    // 同一クッキー×同一人物への同一文面の連投を拒否（クッキー回し連投対策）— 2026-10-23
    if (!rateLimit(`comment:dupe:${userToken}:${personId}:${hashDeleteKey(content)}`, 1, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "同じ内容を続けて投稿することはできません" },
        { status: 429 }
      );
    }
    if (charCount(content) > MAX_COMMENT_CHARS) {
      return NextResponse.json(
        { success: false, error: `コメントは全角${Math.floor(MAX_COMMENT_CHARS / 2)}文字（半角${MAX_COMMENT_CHARS}文字）以内です` },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!rateLimit(`comment:ip:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "投稿が多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    if (!rateLimit(`comment:ipday:${ip}`, 2000, 24 * 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "本日の投稿数が上限に達しました。明日またお試しください" },
        { status: 429 }
      );
    }

    const deleteKey = genDeleteKey();
    const result = await postComment({
      personId,
      name: name && name.trim() ? name : null,
      mail,
      userId,
      gender,
      ageGroup,
      voteType,
      content,
      parentCommentId,
      cookieId: userToken,
      deleteKeyHash: hashDeleteKey(deleteKey),
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ success: true, comment: result.comment, deleteKey });
  } catch (e) {
    console.error("comments POST error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/** 2ch式: 削除キーが一致すればコメントを削除 */
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = str(body.id, 40);
    const key = str(body.key, 64);
    if (!isUuid(id) || !key) {
      return NextResponse.json({ success: false, error: "削除キーが正しくありません" }, { status: 400 });
    }
    const ip = clientIp(request);
    if (!rateLimit(`commentdel:ip:${ip}`, 60, 60 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "試行回数が多すぎます。しばらくお待ちください" },
        { status: 429 }
      );
    }
    const ok = await deleteCommentByKey(id, hashDeleteKey(key));
    if (!ok) {
      return NextResponse.json({ success: false, error: "削除キーが一致しません" }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("comments DELETE error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
