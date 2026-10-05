import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { getNewPeopleToday, getRanking, getRecentComments, getTodayStats } from "@/lib/queries";
import RankTable from "@/components/RankTable";
import PersonCard from "@/components/PersonCard";
import Avatar from "@/components/Avatar";
import { num } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "今日のまとめ",
  description:
    "今日の投票数・24時間の急上昇ランキング・新しく追加されたXユーザー・新着コメントをまとめてチェック。",
  alternates: { canonical: "/today" },
};

export default async function TodayPage() {
  const [stats, daily, newToday, recent] = await Promise.all([
    getTodayStats(),
    getRanking("daily", 10),
    getNewPeopleToday(6),
    getRecentComments(6),
  ]);
  const jst = new Date(Date.now() + 9 * 3600_000);
  const dateLabel = `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
  const shareText = `今日のツイッタラー世論調査（${dateLabel}）\n投票${stats.votes}票・投票した人${stats.voters}人\n急上昇1位は ${daily[0]?.name ?? "—"}！`;
  const shareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText + "\n#ツイッタラー世論調査"
  )}&url=${encodeURIComponent(SITE_URL + "/today")}`;

  return (
    <div className="space-y-5">
      {/* ヘッダー + 今日の数字 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black">今日のまとめ（{dateLabel}）</h1>
            <p className="text-sm text-mut mt-1">今日の数字・急上昇・新着をまとめてチェック。</p>
          </div>
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
          >
            Xでシェア
          </a>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <StatCard label="今日の投票" value={num(stats.votes)} accent />
          <StatCard label="投票した人" value={num(stats.voters)} />
          <StatCard label="新しく追加" value={num(stats.newPeople)} />
          <StatCard label="コメント" value={num(stats.comments)} />
        </div>
      </section>

      {/* 24時間の急上昇 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-x" />
            24時間の急上昇
          </h2>
          <Link href="/ranking/daily" className="text-xs text-x hover:underline flex items-center gap-0.5">
            もっと見る <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <RankTable rows={daily} kind="daily" />
      </section>

      {/* 今日追加された人 */}
      {newToday.length > 0 && (
        <section>
          <h2 className="font-bold mb-3 px-1">今日追加されたXユーザー</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {newToday.map((p) => (
              <PersonCard key={p.id} p={p} />
            ))}
          </div>
        </section>
      )}

      {/* 新着コメント */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">新着コメント</h2>
        <div className="space-y-2">
          {recent.map((c) => (
            <Link
              key={c.id}
              href={`/person/${c.person_id}#c${c.comment_number}`}
              className="flex items-start gap-3 p-2 rounded-xl hover:bg-panel2 transition"
            >
              <Avatar name={c.person_name} avatarUrl={c.person_avatar} size={32} />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-mut truncate">
                  <span className="font-bold text-txt">{c.person_name}</span> への
                  {c.vote_type === "like" ? "好き派" : "嫌い派"}コメント
                </div>
                <p className="text-sm line-clamp-2 mt-0.5">{c.content}</p>
              </div>
            </Link>
          ))}
          {recent.length === 0 && <p className="text-sm text-mut text-center py-4">まだコメントがありません</p>}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-panel2 border border-line rounded-xl p-3 text-center">
      <div className={`text-xl font-black ${accent ? "text-x" : ""}`}>{value}</div>
      <div className="text-xs text-mut mt-0.5">{label}</div>
    </div>
  );
}
