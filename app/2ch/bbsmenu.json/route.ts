// 2ch専ブラ用 bbsmenu.json（板メニュー）
import { NextResponse } from "next/server";

export const dynamic = "force-static";

const SITE = process.env.SITE_URL || "https://tsuittara-yoron.hikamers.app";

export function GET() {
  const menu = {
    menu_list: [
      {
        category_name: "ヒカマーズ",
        category_content: [
          { board_name: "ツイッタラー世論調査（人物）", url: `${SITE}/2ch/people/`, directory_name: "people" },
          { board_name: "ツイッタラー世論調査（投票トーク）", url: `${SITE}/2ch/polls/`, directory_name: "polls" },
          { board_name: "ツイッタラー世論調査（管理）", url: `${SITE}/2ch/meta/`, directory_name: "meta" },
        ],
      },
    ],
  };
  return new NextResponse(JSON.stringify(menu), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
