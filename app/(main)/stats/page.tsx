import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import Link from "next/link";
import {
  getCategoryStats,
  getDailyTrend,
  getEvalCorrelation,
  getEvalTotalCount,
  getFollowerBuckets,
  getHomeStats,
  getItemAverages,
  getLikeRatioTrend,
  getRanking,
  getScoreDistribution,
  getSousenkyoRanking,
  getSousenkyoTotalVotes,
  getTagStats,
  getTopCommented,
  getTopEvaluated,
  getVoteHeatmap,
  getVoteHourHistogram,
  getVoteTypeTotals,
  getVoteWeekdayHistogram,
} from "@/lib/queries";
import { EVAL_ITEMS, SOUSENKYO } from "@/lib/constants";
import { num } from "@/lib/format";
import Avatar from "@/components/Avatar";
import EmojiText from "@/components/EmojiText";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t("統計"),
    description: t(
      "ツイッタラー世論調査の統計。カテゴリ別・タグ別の傾向、8項目評価の相関とスコア分布を公開しています。"
    ),
    alternates: { canonical: localePath(locale, "/stats") },
  };
}

const LABEL: Record<string, string> = Object.fromEntries(EVAL_ITEMS.map((i) => [i.key, i.label]));

function corrColor(v: number): string {
  // 相関 -1..1 → 赤〜青の透明度
  const a = Math.min(Math.abs(v), 1);
  if (v >= 0) return `rgba(29, 155, 240, ${(0.08 + a * 0.75).toFixed(2)})`;
  return `rgba(244, 33, 46, ${(0.08 + a * 0.75).toFixed(2)})`;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export default async function StatsPage() {
  const t = await getServerT();
  const [stats, evalTotal, categories, tags, corr, dist, trend30, topScore, lowScore, hourHist, weekdayHist, itemAvgs, topEval, topComment, trending5, likeTrend, voteTotals, heatmap, followerBuckets, sousenkyo10, sousenkyoTotal] = await Promise.all([
    getHomeStats(),
    getEvalTotalCount(),
    getCategoryStats(),
    getTagStats(2, 20),
    getEvalCorrelation(),
    getScoreDistribution(),
    getDailyTrend(30),
    getRanking("score", 5),
    getRanking("lowscore", 5),
    getVoteHourHistogram(),
    getVoteWeekdayHistogram(),
    getItemAverages(),
    getTopEvaluated(5),
    getTopCommented(5),
    getRanking("trending", 5),
    getLikeRatioTrend(30),
    getVoteTypeTotals(),
    getVoteHeatmap(),
    getFollowerBuckets(),
    getSousenkyoRanking(10),
    getSousenkyoTotalVotes(),
  ]);
  const trend = trend30.slice(-7);
  const today = trend[trend.length - 1];
  const maxV = Math.max(1, ...trend.map((d) => d.votes));
  const maxC = Math.max(1, ...trend.map((d) => d.comments));
  const maxE = Math.max(1, ...trend.map((d) => d.evals));
  const max30 = Math.max(1, ...trend30.map((d) => d.votes));
  const maxNew = Math.max(1, ...trend30.map((d) => d.newPeople));
  const peak30 = trend30.reduce((a, b) => (b.votes > a.votes ? b : a), trend30[0]);
  const total30 = trend30.reduce((a, b) => a + b.votes, 0);
  const totalNew = trend30.reduce((a, b) => a + b.newPeople, 0);
  const weekVotes = trend30.slice(-7).reduce((a, b) => a + b.votes, 0);
  const prevWeekVotes = trend30.slice(-14, -7).reduce((a, b) => a + b.votes, 0);
  const weekDelta = prevWeekVotes > 0 ? Math.round(((weekVotes - prevWeekVotes) / prevWeekVotes) * 100) : null;
  const totalVotesAll = voteTotals.likes + voteTotals.dislikes;
  const likePct = totalVotesAll > 0 ? (voteTotals.likes / totalVotesAll) * 100 : 0;
  const maxH = Math.max(1, ...hourHist);
  const maxW = Math.max(1, ...weekdayHist);
  const maxCell = Math.max(1, ...heatmap.flat());
  const maxFollower = Math.max(1, ...followerBuckets);
  const sousenkyoNow = Date.now() < Date.parse(SOUSENKYO.endIso);

  const corrMap = new Map(corr.map((c) => [`${c.a}__${c.b}`, c.value]));
  const corrOf = (a: string, b: string): number | null => {
    if (a === b) return 1;
    const v = corrMap.get(`${a}__${b}`) ?? corrMap.get(`${b}__${a}`);
    return v ?? null;
  };

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h1 className="text-xl font-black">{t("統計")}</h1>
        <p className="text-sm text-mut mt-1">{t("集まったデータの傾向をまとめています。")}</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-5 text-sm">
          <Stat label={t("登録人物")} value={num(stats.people)} />
          <Stat label={t("総投票数")} value={num(stats.votes)} />
          <Stat label={t("コメント")} value={num(stats.comments)} />
          <Stat label={t("8項目評価")} value={num(evalTotal)} />
          <Stat label={t("今日の投票")} value={num(stats.today_votes)} accent />
        </div>
        {today && (
          <p className="text-xs text-mut mt-3">
            {t("今日（JST）: 投票 {votes}・コメント {comments}・評価 {evals}・新規人物 {people}", {
              votes: num(today.votes),
              comments: num(today.comments),
              evals: num(today.evals),
              people: num(today.newPeople),
            })}
          </p>
        )}
        {weekDelta != null && (
          <p className="text-xs text-mut mt-1">
            {prevWeekVotes >= 100
              ? t("今週 {n}票（先週比 {d}%）", {
                  n: num(weekVotes),
                  d: (weekDelta >= 0 ? "+" : "") + weekDelta,
                })
              : t("今週 {n}票（先週 {p}票）", { n: num(weekVotes), p: num(prevWeekVotes) })}
          </p>
        )}
      </section>

      {/* 衆院選 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold">
            {t("第1回ツイッタラー衆院選")}
            <span className="ml-2 text-xs font-normal text-x">{t("開催中")}</span>
          </h2>
          <Link href="/election" className="text-xs text-x hover:underline">{t("特設ページ")}</Link>
        </div>
        <p className="text-xs text-mut">
          {t("10/10(土)〜10/24(土)の2週間。好き+1票・嫌い-0.5票で289選挙区+176比例を争います。")}
        </p>
      </section>

      {/* 直近7日の推移 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("直近7日の推移")}</h2>
        <p className="text-xs text-mut mb-4">{t("日別のカウント（JST）。棒の長さは各指標の最大値比。")}</p>
        <div className="space-y-2.5">
          {trend.map((d) => (
            <div key={d.day} className="flex items-center gap-3 text-xs">
              <span className="w-12 text-mut shrink-0">{d.day.slice(5).replace("-", "/")}</span>
              <div className="flex-1 space-y-1">
                <div className="h-1.5 rounded bg-panel2 overflow-hidden">
                  <div className="h-full bg-like" style={{ width: `${(d.votes / maxV) * 100}%` }} />
                </div>
                <div className="h-1.5 rounded bg-panel2 overflow-hidden">
                  <div className="h-full bg-x" style={{ width: `${(d.comments / maxC) * 100}%` }} />
                </div>
                <div className="h-1.5 rounded bg-panel2 overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${(d.evals / maxE) * 100}%` }} />
                </div>
              </div>
              <span className="hidden sm:block w-56 text-right text-mut shrink-0">
                {t("投票 {votes}・コメ {comments}・評価 {evals}・新規 {people}", {
                  votes: num(d.votes),
                  comments: num(d.comments),
                  evals: num(d.evals),
                  people: num(d.newPeople),
                })}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-mut">
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-like" />
            {t("投票")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-x" />
            {t("コメント")}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-gold" />
            {t("評価")}
          </span>
        </div>
      </section>

      {/* 30日推移 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("全期間の推移（30日）")}</h2>
        <p className="text-xs text-mut mb-4">{t("日別の投票数（JST）。棒にカーソルで詳細。")}</p>
        <div className="flex items-end gap-[2px] h-24">
          {trend30.map((d) => (
            <div
              key={d.day}
              className="flex-1 flex flex-col justify-end h-full group"
              title={`${d.day.slice(5).replace("-", "/")}: ${num(d.votes)}票`}
            >
              <div
                className="bg-like rounded-t group-hover:bg-x transition-colors"
                style={{ height: `${Math.max(2, (d.votes / max30) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-mut mt-1">
          <span>{trend30[0]?.day.slice(5).replace("-", "/")}</span>
          <span>{trend30[trend30.length - 1]?.day.slice(5).replace("-", "/")}</span>
        </div>
        <p className="text-xs text-mut mt-2">
          {t("30日合計 {n}票・ピーク {day}（{v}票）", {
            n: num(total30),
            day: peak30?.day.slice(5).replace("-", "/") ?? "—",
            v: num(peak30?.votes ?? 0),
          })}
        </p>
      </section>

      {/* 新規登録の推移 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("新規登録の推移（30日）")}</h2>
        <p className="text-xs text-mut mb-4">{t("日別の新規追加人数（JST）。")}</p>
        <div className="flex items-end gap-[2px] h-20">
          {trend30.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col justify-end h-full group" title={`${d.day.slice(5).replace("-", "/")}: ${num(d.newPeople)}人`}>
              <div
                className="bg-good/70 rounded-t group-hover:bg-good transition-colors"
                style={{ height: `${Math.max(2, (d.newPeople / maxNew) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-mut mt-1">
          <span>{trend30[0]?.day.slice(5).replace("-", "/")}</span>
          <span>{trend30[trend30.length - 1]?.day.slice(5).replace("-", "/")}</span>
        </div>
        <p className="text-xs text-mut mt-2">{t("30日合計 {n}人", { n: num(totalNew) })}</p>
      </section>

      {/* 好き/嫌い比率 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("好き/嫌いの比率")}</h2>
        <p className="text-xs text-mut mb-4">{t("全投票の内訳と、直近30日の好き率の推移。")}</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-5 rounded-lg overflow-hidden flex bg-panel2">
            <div className="bg-like" style={{ width: `${likePct}%` }} />
            <div className="bg-dislike" style={{ width: `${100 - likePct}%` }} />
          </div>
          <span className="text-sm font-bold text-like shrink-0">{likePct.toFixed(1)}%</span>
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-mut">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-like" />
            {t("好き {l}票", { l: num(voteTotals.likes) })}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-dislike" />
            {t("嫌い {d}票", { d: num(voteTotals.dislikes) })}
          </span>
        </div>
        <div className="text-xs text-mut mb-1 mt-4">{t("直近30日の好き率")}</div>
        <div className="flex items-end gap-[2px] h-16">
          {likeTrend.map((d) => {
            const pct = d.total > 0 ? (d.likes / d.total) * 100 : 0;
            return (
              <div key={d.day} className="flex-1 flex flex-col justify-end h-full" title={`${d.day.slice(5).replace("-", "/")}: ${pct.toFixed(0)}%（${num(d.total)}票）`}>
                <div className="bg-like/70 rounded-t" style={{ height: `${Math.max(2, pct)}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-mut mt-1">
          <span>{likeTrend[0]?.day.slice(5).replace("-", "/")}</span>
          <span>{likeTrend[likeTrend.length - 1]?.day.slice(5).replace("-", "/")}</span>
        </div>
      </section>

      {/* 時間帯・曜日 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("いつ投票されてる？")}</h2>
        <p className="text-xs text-mut mb-4">{t("全期間の投票を時間帯・曜日で集計（JST）。")}</p>
        <div className="text-xs text-mut mb-1">{t("時間帯（JST・全期間）")}</div>
        <div className="flex items-end gap-[3px] h-16">
          {hourHist.map((n, h) => (
            <div key={h} className="flex-1 flex flex-col justify-end h-full group" title={`${h}時: ${num(n)}票`}>
              <div
                className="bg-x/70 rounded-t group-hover:bg-x transition-colors"
                style={{ height: `${Math.max(2, (n / maxH) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-mut mt-1">
          <span>0</span>
          <span>6</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
        <div className="text-xs text-mut mb-1 mt-5">{t("曜日（JST・全期間）")}</div>
        <div className="flex items-end gap-2 h-16">
          {weekdayHist.map((n, d) => (
            <div key={d} className="flex-1 flex flex-col justify-end h-full group" title={`${t(WEEKDAYS[d])}: ${num(n)}票`}>
              <div
                className="bg-like/70 rounded-t group-hover:bg-like transition-colors"
                style={{ height: `${Math.max(2, (n / maxW) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-[10px] text-mut mt-1">
          {WEEKDAYS.map((w) => (
            <span key={w} className="flex-1 text-center">{t(w)}</span>
          ))}
        </div>
        <div className="text-xs text-mut mb-1 mt-5">{t("時間帯×曜日ヒートマップ")}</div>
        <div className="space-y-[2px]">
          {heatmap.map((row, d) => (
            <div key={d} className="flex items-center gap-[2px]">
              <span className="w-5 text-[10px] text-mut shrink-0 text-right">{t(WEEKDAYS[d])}</span>
              {row.map((n, h) => (
                <div
                  key={h}
                  className="flex-1 h-3 rounded-[2px]"
                  style={{ backgroundColor: `rgba(29, 155, 240, ${(0.06 + (n / maxCell) * 0.9).toFixed(2)})` }}
                  title={`${t(WEEKDAYS[d])} ${h}時: ${num(n)}票`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex text-[10px] text-mut mt-1">
          <span className="w-5 shrink-0" />
          <span className="flex-1">0</span>
          <span className="flex-1 text-center">6</span>
          <span className="flex-1 text-center">12</span>
          <span className="flex-1 text-center">18</span>
          <span className="flex-1 text-right">23</span>
        </div>
      </section>

      {/* 総合評価トップ / 低評価ワースト */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("総合評価トップ5")}</h2>
            <Link href="/ranking/score" className="text-xs text-x hover:underline">
              {t("もっと見る")}
            </Link>
          </div>
          {topScore.map((p, i) => (
            <Link
              key={p.id}
              href={`/person/${p.id}`}
              className="flex items-center gap-3 py-2 border-b border-line/60 last:border-0 hover:bg-panel2 transition rounded-lg px-1"
            >
              <span className="w-5 text-center font-black text-gold shrink-0">{i + 1}</span>
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={28} />
              <span className="text-sm truncate flex-1"><EmojiText text={p.name} /></span>
              <span className="text-sm font-bold text-gold shrink-0">
                {p.overall != null ? p.overall.toFixed(2) : "—"}
                <span className="text-[10px] text-mut ml-1">{t("（{n}人）", { n: p.evalCount ?? 0 })}</span>
              </span>
            </Link>
          ))}
          {topScore.length === 0 && (
            <p className="text-sm text-mut py-3">{t("まだデータがありません（5人以上の評価が必要）")}</p>
          )}
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("低評価ワースト5")}</h2>
            <Link href="/ranking/lowscore" className="text-xs text-x hover:underline">
              {t("もっと見る")}
            </Link>
          </div>
          {lowScore.map((p, i) => (
            <Link
              key={p.id}
              href={`/person/${p.id}`}
              className="flex items-center gap-3 py-2 border-b border-line/60 last:border-0 hover:bg-panel2 transition rounded-lg px-1"
            >
              <span className="w-5 text-center font-black text-bad shrink-0">{i + 1}</span>
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={28} />
              <span className="text-sm truncate flex-1"><EmojiText text={p.name} /></span>
              <span className="text-sm font-bold text-bad shrink-0">
                {p.overall != null ? p.overall.toFixed(2) : "—"}
                <span className="text-[10px] text-mut ml-1">{t("（{n}人）", { n: p.evalCount ?? 0 })}</span>
              </span>
            </Link>
          ))}
          {lowScore.length === 0 && (
            <p className="text-sm text-mut py-3">{t("まだデータがありません（5人以上の評価が必要）")}</p>
          )}
        </div>
      </section>

      {/* 急上昇・評価数・コメント数 TOP5 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-panel border border-line rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold">{t("急上昇 TOP5（7日）")}</h2>
            <Link href="/ranking/trending" className="text-xs text-x hover:underline">{t("もっと見る")}</Link>
          </div>
          {trending5.map((p, i) => (
            <Link key={p.id} href={`/person/${p.id}`} className="flex items-center gap-3 py-2 border-b border-line/60 last:border-0 hover:bg-panel2 transition rounded-lg px-1">
              <span className="w-5 text-center font-black text-x shrink-0">{i + 1}</span>
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={28} />
              <span className="text-sm truncate flex-1"><EmojiText text={p.name} /></span>
              <span className="text-sm font-bold text-x shrink-0">{t("{n}票", { n: num(p.recentVotes ?? 0) })}</span>
            </Link>
          ))}
          {trending5.length === 0 && <p className="text-sm text-mut py-3">{t("まだデータがありません")}</p>}
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-2">{t("評価が多い人 TOP5")}</h2>
          {topEval.map((p, i) => (
            <Link key={p.id} href={`/person/${p.id}`} className="flex items-center gap-3 py-2 border-b border-line/60 last:border-0 hover:bg-panel2 transition rounded-lg px-1">
              <span className="w-5 text-center font-black text-gold shrink-0">{i + 1}</span>
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={28} />
              <span className="text-sm truncate flex-1"><EmojiText text={p.name} /></span>
              <span className="text-sm font-bold text-gold shrink-0">{t("{n}件", { n: num(p.cnt) })}</span>
            </Link>
          ))}
          {topEval.length === 0 && <p className="text-sm text-mut py-3">{t("まだデータがありません")}</p>}
        </div>
        <div className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-2">{t("コメントが多い人 TOP5")}</h2>
          {topComment.map((p, i) => (
            <Link key={p.id} href={`/person/${p.id}`} className="flex items-center gap-3 py-2 border-b border-line/60 last:border-0 hover:bg-panel2 transition rounded-lg px-1">
              <span className="w-5 text-center font-black text-x shrink-0">{i + 1}</span>
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={28} />
              <span className="text-sm truncate flex-1"><EmojiText text={p.name} /></span>
              <span className="text-sm font-bold shrink-0">{t("{n}件", { n: num(p.cnt) })}</span>
            </Link>
          ))}
          {topComment.length === 0 && <p className="text-sm text-mut py-3">{t("まだデータがありません")}</p>}
        </div>
      </section>

      {/* カテゴリ別 */}
      <section className="bg-panel border border-line rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-4">{t("カテゴリ別")}</h2>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-mut border-b border-line">
              <th className="py-2 pr-3 font-normal">{t("カテゴリ")}</th>
              <th className="py-2 pr-3 font-normal text-right">{t("人数")}</th>
              <th className="py-2 pr-3 font-normal text-right">{t("票数")}</th>
              <th className="py-2 pr-3 font-normal text-right">{t("平均好き率")}</th>
              <th className="py-2 font-normal text-right">{t("平均スコア")}</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.category} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3 font-medium">{t(c.category)}</td>
                <td className="py-2 pr-3 text-right">{c.people}</td>
                <td className="py-2 pr-3 text-right text-mut">{num(c.votes)}</td>
                <td className="py-2 pr-3 text-right text-like font-bold">
                  {c.avg_like != null ? `${c.avg_like}%` : "—"}
                </td>
                <td className="py-2 text-right text-gold font-bold">
                  {c.avg_score != null ? c.avg_score.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* タグ別 */}
      <section className="bg-panel border border-line rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-4">{t("タグ別（2人以上・上位20）")}</h2>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-mut border-b border-line">
              <th className="py-2 pr-3 font-normal">{t("タグ")}</th>
              <th className="py-2 pr-3 font-normal text-right">{t("人数")}</th>
              <th className="py-2 pr-3 font-normal text-right">{t("票数")}</th>
              <th className="py-2 pr-3 font-normal text-right">{t("平均好き率")}</th>
              <th className="py-2 font-normal text-right">{t("平均スコア")}</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tg) => (
              <tr key={tg.tag} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3">
                  <Link href={`/tag/${encodeURIComponent(tg.tag)}`} className="font-medium hover:text-x transition">
                    {tg.tag}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right">{tg.people}</td>
                <td className="py-2 pr-3 text-right text-mut">{num(tg.votes)}</td>
                <td className="py-2 pr-3 text-right text-like font-bold">
                  {tg.avg_like != null ? `${tg.avg_like}%` : "—"}
                </td>
                <td className="py-2 text-right text-gold font-bold">
                  {tg.avg_score != null ? tg.avg_score.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* フォロワー数分布 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("フォロワー数分布")}</h2>
        <p className="text-xs text-mut mb-4">{t("登録人物のフォロワー数（X取得済み）の分布。")}</p>
        <div className="space-y-2.5">
          {followerBuckets.map((n, i) => {
            const label = i === 5 ? t("不明") : ["〜100", "100〜1,000", "1,000〜10,000", "10,000〜100,000", "100,000〜"][i];
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-mut w-28 shrink-0 text-right">{label}</span>
                <div className="flex-1 h-3 rounded bg-panel2 overflow-hidden">
                  <div className="h-full bg-x/60" style={{ width: `${(n / maxFollower) * 100}%` }} />
                </div>
                <span className="text-xs font-bold w-16 text-right">{t("{n}人", { n: num(n) })}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 相関ヒートマップ */}
      <section className="bg-panel border border-line rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-1">{t("8項目評価の相関")}</h2>
        <p className="text-xs text-mut mb-4">
          {t("青=正の相関（一緒に高い/低い）、赤=負の相関。1に近いほど連動しています（斜めは同じ項目なので除く）。")}
        </p>
        <table className="text-xs border-separate border-spacing-0.5 min-w-[460px]">
          <thead>
            <tr>
              <th />
              {EVAL_ITEMS.map((i) => (
                <th key={i.key} className="font-normal text-mut px-1 pb-1 text-center whitespace-nowrap">
                  {t(i.label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVAL_ITEMS.map((row) => (
              <tr key={row.key}>
                <td className="text-mut pr-2 whitespace-nowrap text-right">{t(row.label)}</td>
                {EVAL_ITEMS.map((col) => {
                  const isDiag = row.key === col.key;
                  const v = isDiag ? null : corrOf(row.key, col.key);
                  return (
                    <td
                      key={col.key}
                      className={`w-12 h-8 text-center text-[10px] font-bold ${isDiag ? "text-mut/50" : ""}`}
                      style={{ backgroundColor: v != null ? corrColor(v) : "transparent" }}
                      title={isDiag ? t("同じ項目") : `${t(row.label)} × ${t(col.label)}: ${v != null ? v.toFixed(2) : "—"}`}
                    >
                      {isDiag ? "—" : v != null ? v.toFixed(2) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* スコア分布 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("スコア分布")}</h2>
        <p className="text-xs text-mut mb-4">{t("各項目の評価（1〜5）の割合。好き嫌い投票から書き込まれるため、1と5に偏る傾向があります。")}</p>
        <div className="space-y-3">
          {EVAL_ITEMS.map((item) => {
            const counts = dist[item.key] ?? [0, 0, 0, 0, 0];
            const total = counts.reduce((a, b) => a + b, 0);
            const tones = ["bg-bad/50", "bg-amber-500/50", "bg-line2", "bg-x/60", "bg-good/70"];
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-xs text-mut w-20 shrink-0 text-right">{t(item.label)}</span>
                <div className="flex-1 h-5 rounded-lg overflow-hidden flex bg-panel2">
                  {counts.map((c, i) => (
                    <div
                      key={i}
                      className={tones[i]}
                      style={{ width: total > 0 ? `${(c / total) * 100}%` : "0%" }}
                      title={t("{n}点: {c}件", { n: i + 1, c })}
                    />
                  ))}
                  {total === 0 && <div className="flex-1" />}
                </div>
                <span className="text-xs text-mut w-14 shrink-0">{t("{n}件", { n: total })}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-[10px] text-mut">
          {["1", "2", "3", "4", "5"].map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${["bg-bad/50", "bg-amber-500/50", "bg-line2", "bg-x/60", "bg-good/70"][i]}`} />
              {t("{n}点", { n })}
            </span>
          ))}
        </div>
      </section>

      {/* 項目別平均 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-1">{t("評価項目の全体平均")}</h2>
        <p className="text-xs text-mut mb-4">{t("全評価の項目別平均（1〜5）。")}</p>
        <div className="space-y-2.5">
          {EVAL_ITEMS.map((item) => {
            const avg = itemAvgs[item.key];
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-xs text-mut w-20 shrink-0 text-right">{t(item.label)}</span>
                <div className="flex-1 h-3 rounded bg-panel2 overflow-hidden">
                  <div className="h-full bg-x/70" style={{ width: `${avg != null ? (avg / 5) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-bold w-10 text-right">{avg != null ? avg.toFixed(2) : "—"}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className={`text-lg font-black ${accent ? "text-x" : ""}`}>{value}</div>
      <div className="text-xs text-mut">{label}</div>
    </div>
  );
}
