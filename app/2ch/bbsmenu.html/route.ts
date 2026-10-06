// 2ch専ブラ用 bbsmenu.html（旧形式の板メニュー・HTML版）
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const SITE = process.env.SITE_URL || "https://tsuittara-yoron.hikamers.app";

export function GET() {
  const html = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><title>bbsmenu</title></head><body>
<br><b>ヒカマーズ</b><br>
<a href="${SITE}/2ch/people/">ツイッタラー世論調査（人物）</a><br>
<a href="${SITE}/2ch/polls/">ツイッタラー世論調査（投票トーク）</a><br>
<a href="${SITE}/2ch/meta/">ツイッタラー世論調査（管理）</a><br>
</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
