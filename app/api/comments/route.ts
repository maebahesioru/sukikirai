import { NextResponse } from "next/server";
import { deleteCommentByKey, getComments, postComment } from "@/lib/queries";
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

    if (!personId) {
      return NextResponse.json({ success: false, error: "personId required" }, { status: 400 });
    }
    const filter = filterRaw === "like" || filterRaw === "dislike" ? filterRaw : "all";
    const sort = sortRaw === "popular" ? "popular" : "newest";

    const { comments, total } = await getComments(personId, { filter, sort, page });
    return NextResponse.json({ success: true, comments, total });
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
    if (charCount(content) > MAX_COMMENT_CHARS) {
      return NextResponse.json(
        { success: false, error: `コメントは全角${Math.floor(MAX_COMMENT_CHARS / 2)}文字（半角${MAX_COMMENT_CHARS}文字）以内です` },
        { status: 400 }
      );
    }

    const ip = clientIp(request);
    if (!rateLimit(`comment:ip:${ip}`, 300, 60 * 60 * 1000)) {
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
