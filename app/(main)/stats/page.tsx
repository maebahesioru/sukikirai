import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import Link from "next/link";
import {
  getCategoryStats,
  getDailyTrend,
  getEvalCorrelation,
  getEvalTotalCount,
  getHomeStats,
  getRanking,
  getScoreDistribution,
  getTagStats,
} from "@/lib/queries";
import { EVAL_ITEMS } from "@/lib/constants";
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

export default async function StatsPage() {
  const t = await getServerT();
  const [stats, evalTotal, categories, tags, corr, dist, trend, topScore, lowScore] = await Promise.all([
    getHomeStats(),
    getEvalTotalCount(),
    getCategoryStats(),
    getTagStats(2, 20),
    getEvalCorrelation(),
    getScoreDistribution(),
    getDailyTrend(7),
    getRanking("score", 5),
    getRanking("lowscore", 5),
  ]);
  const today = trend[trend.length - 1];
  const maxV = Math.max(1, ...trend.map((d) => d.votes));
  const maxC = Math.max(1, ...trend.map((d) => d.comments));
  const maxE = Math.max(1, ...trend.map((d) => d.evals));

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
        <p className="text-xs text-mut mb-4">{t("各項目の評価（1〜5）の割合。")}</p>
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
