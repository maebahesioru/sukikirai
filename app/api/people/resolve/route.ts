import { NextResponse } from "next/server";
import { addPersonFromX, findVisiblePersonByHandleOrId, normalizeHandle } from "@/lib/queries";
import { autoTagPerson } from "@/lib/autotag";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { str } from "@/lib/validate";
import { pingIndexNow } from "@/lib/indexnow";
import { SITE_URL } from "@/lib/site";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = str(body.query, 60).trim();
    if (!query) {
      return NextResponse.json({ success: false, error: "検索ワードを入力してください" }, { status: 400 });
    }

    // 既に登録済みならレート制限を通さずに即返す（2026-10-30）。
    // 同じ人のページを何度も検索し直した時に「追加リクエストが多すぎます／少し待ってから」で
    // 弾かれ、「追加できない」と誤解されるのを防ぐ。DB参照だけなので外部呼び出しは無い。
    const handleNorm = normalizeHandle(query);
    if (handleNorm) {
      const known = await findVisiblePersonByHandleOrId(handleNorm);
      if (known) {
        return NextResponse.json({
          success: true,
          created: false,
          person: {
            id: known.id,
            name: known.name,
            handle: known.handle,
            avatar_url: known.avatar_url,
          },
        });
      }
    }

    const ip = clientIp(request);
    if (!rateLimit(`resolve:ip:${ip}`, 60, 60 * 60 * 1000)) {
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
    if (result.created) {
      // 新規追加はタグを自動付与（バックグラウンド・失敗しても応答には影響しない）
      void autoTagPerson(result.person.id).catch((e) => console.error("[autotag]", e));
      // 検索エンジンへ即時通知（IndexNow）
      void pingIndexNow([`${SITE_URL}/person/${result.person.id}`]);
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
