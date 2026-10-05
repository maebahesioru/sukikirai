import Link from "next/link";
import { Trophy } from "lucide-react";
import { getSousenkyoRanking } from "@/lib/queries";
import { SOUSENKYO } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import { num } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SOUSENKYO.title,
  description: "期間中の投票数で王者を決める期間限定イベント。毎日1票、推しに投票しよう。",
  alternates: { canonical: "/sousenkyo" },
  openGraph: {
    title: `${SOUSENKYO.title} - 10/6開幕`,
    description: "期間中の投票数で王者を決める期間限定イベント。毎日1票、推しに投票しよう。",
    images: ["/og.png"],
  },
};

export default async function SousenkyoPage() {
  const now = Date.now();
  const start = Date.parse(SOUSENKYO.startIso);
  const end = Date.parse(SOUSENKYO.endIso);
  const phase: "before" | "live" | "after" = now < start ? "before" : now <= end ? "live" : "after";
  const ranking = phase === "before" ? [] : await getSousenkyoRanking(20);
  const remainDays = Math.max(0, Math.ceil((end - now) / 86400_000));

  const headline =
    phase === "before"
      ? `${SOUSENKYO.periodLabel.split(" 〜 ")[0]} に開幕！`
      : phase === "live"
        ? `開催中！残り${remainDays}日`
        : "閉幕！最終結果はこちら";

  const shareText =
    phase === "after"
      ? `【結果発表】${SOUSENKYO.title}\n王者は ${ranking[0]?.name ?? "—"}（${num(ranking[0]?.recentVotes ?? 0)}票）！`
      : `【${SOUSENKYO.title}】開催中！期間中の投票数で王者を決めます。毎日投票OK`;
  const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText + "\n#ツイッタラー世論調査"
  )}&url=${encodeURIComponent(SITE_URL + "/sousenkyo")}`;

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <section className="relative overflow-hidden bg-panel border border-line rounded-2xl p-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-like/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-gold text-sm font-bold">
            <Trophy className="w-4 h-4" />
            期間限定イベント
          </div>
          <h1 className="text-3xl font-black mt-2">{SOUSENKYO.title}</h1>
          <p className="text-sm text-mut mt-2">期間: {SOUSENKYO.periodLabel}</p>
          <p className="mt-4 font-black text-lg">{headline}</p>
          <p className="text-sm text-mut mt-1 leading-relaxed">
            期間中に集まった「好き／嫌い」投票の合計数でランキングを競います。投票は1日1回・毎日投票OK。
          </p>
          <div className="mt-4">
            <a
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
            >
              Xでシェア
            </a>
          </div>
        </div>
      </section>

      {/* 途中経過 / 最終結果 */}
      {phase !== "before" && (
        <section className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-4">{phase === "live" ? "途中経過" : "最終結果"}</h2>
          <div className="space-y-1.5">
            {ranking.map((p, i) => (
              <Link
                key={p.id}
                href={`/person/${p.id}`}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-panel2 transition"
              >
                <span
                  className={`w-6 text-center text-sm font-black shrink-0 ${
                    i === 0 ? "text-gold" : i === 1 ? "text-mut" : i === 2 ? "text-amber-600" : "text-mut/60"
                  }`}
                >
                  {i + 1}
                </span>
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={34} />
                <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                <span className="text-xs font-bold text-x shrink-0">{num(p.recentVotes)}票</span>
              </Link>
            ))}
            {ranking.length === 0 && <p className="text-sm text-mut text-center py-4">まだ票がありません</p>}
          </div>
        </section>
      )}

      {/* ルール */}
      <section className="bg-panel border border-line rounded-2xl p-5 text-sm text-mut leading-relaxed">
        <h2 className="font-bold text-txt mb-2">ルール</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>期間中に集まった「好き」「嫌い」の投票数の合計で競います</li>
          <li>投票は1人につき1日1回。毎日投票できます（毎日来るほど推しが有利）</li>
          <li>新しく追加された人物のページも対象です（検索から誰でも追加できます）</li>
          <li>結果は期間終了後にこのページで発表します</li>
        </ul>
      </section>
    </div>
  );
}
