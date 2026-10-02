import type { Metadata } from "next";
import Link from "next/link";
import {
  getCategoryStats,
  getEvalCorrelation,
  getEvalTotalCount,
  getHomeStats,
  getScoreDistribution,
  getTagStats,
} from "@/lib/queries";
import { EVAL_ITEMS } from "@/lib/constants";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "統計",
  description: "ツイッタラー世論調査の統計。カテゴリ別・タグ別の傾向、8項目評価の相関とスコア分布を公開しています。",
  alternates: { canonical: "/stats" },
};

const LABEL: Record<string, string> = Object.fromEntries(EVAL_ITEMS.map((i) => [i.key, i.label]));

function corrColor(v: number): string {
  // 相関 -1..1 → 赤〜青の透明度
  const a = Math.min(Math.abs(v), 1);
  if (v >= 0) return `rgba(29, 155, 240, ${(0.08 + a * 0.75).toFixed(2)})`;
  return `rgba(244, 33, 46, ${(0.08 + a * 0.75).toFixed(2)})`;
}

export default async function StatsPage() {
  const [stats, evalTotal, categories, tags, corr, dist] = await Promise.all([
    getHomeStats(),
    getEvalTotalCount(),
    getCategoryStats(),
    getTagStats(2, 20),
    getEvalCorrelation(),
    getScoreDistribution(),
  ]);

  const corrMap = new Map(corr.map((c) => [`${c.a}__${c.b}`, c.value]));
  const corrOf = (a: string, b: string): number | null => {
    if (a === b) return 1;
    const v = corrMap.get(`${a}__${b}`) ?? corrMap.get(`${b}__${a}`);
    return v ?? null;
  };

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h1 className="text-xl font-black">統計</h1>
        <p className="text-sm text-mut mt-1">集まったデータの傾向をまとめています。</p>
        <div className="flex flex-wrap gap-x-8 gap-y-3 mt-5 text-sm">
          <Stat label="登録人物" value={num(stats.people)} />
          <Stat label="総投票数" value={num(stats.votes)} />
          <Stat label="コメント" value={num(stats.comments)} />
          <Stat label="8項目評価" value={num(evalTotal)} />
          <Stat label="今日の投票" value={num(stats.today_votes)} accent />
        </div>
      </section>

      {/* カテゴリ別 */}
      <section className="bg-panel border border-line rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-4">カテゴリ別</h2>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-mut border-b border-line">
              <th className="py-2 pr-3 font-normal">カテゴリ</th>
              <th className="py-2 pr-3 font-normal text-right">人数</th>
              <th className="py-2 pr-3 font-normal text-right">票数</th>
              <th className="py-2 pr-3 font-normal text-right">平均好き率</th>
              <th className="py-2 font-normal text-right">平均スコア</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.category} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3 font-medium">{c.category}</td>
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
        <h2 className="font-bold mb-4">タグ別（2人以上・上位20）</h2>
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="text-left text-xs text-mut border-b border-line">
              <th className="py-2 pr-3 font-normal">タグ</th>
              <th className="py-2 pr-3 font-normal text-right">人数</th>
              <th className="py-2 pr-3 font-normal text-right">票数</th>
              <th className="py-2 pr-3 font-normal text-right">平均好き率</th>
              <th className="py-2 font-normal text-right">平均スコア</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.tag} className="border-b border-line/60 last:border-0">
                <td className="py-2 pr-3">
                  <Link href={`/tag/${encodeURIComponent(t.tag)}`} className="font-medium hover:text-x transition">
                    {t.tag}
                  </Link>
                </td>
                <td className="py-2 pr-3 text-right">{t.people}</td>
                <td className="py-2 pr-3 text-right text-mut">{num(t.votes)}</td>
                <td className="py-2 pr-3 text-right text-like font-bold">
                  {t.avg_like != null ? `${t.avg_like}%` : "—"}
                </td>
                <td className="py-2 text-right text-gold font-bold">
                  {t.avg_score != null ? t.avg_score.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 相関ヒートマップ */}
      <section className="bg-panel border border-line rounded-2xl p-5 overflow-x-auto">
        <h2 className="font-bold mb-1">8項目評価の相関</h2>
        <p className="text-xs text-mut mb-4">
          青=正の相関（一緒に高い/低い）、赤=負の相関。1に近いほど連動しています。
        </p>
        <table className="text-xs border-separate border-spacing-0.5 min-w-[460px]">
          <thead>
            <tr>
              <th />
              {EVAL_ITEMS.map((i) => (
                <th key={i.key} className="font-normal text-mut px-1 pb-1 text-center whitespace-nowrap">
                  {i.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVAL_ITEMS.map((row) => (
              <tr key={row.key}>
                <td className="text-mut pr-2 whitespace-nowrap text-right">{row.label}</td>
                {EVAL_ITEMS.map((col) => {
                  const v = corrOf(row.key, col.key);
                  return (
                    <td
                      key={col.key}
                      className="w-12 h-8 text-center text-[10px] font-bold"
                      style={{ backgroundColor: v != null ? corrColor(v) : "transparent" }}
                      title={`${row.label} × ${col.label}: ${v != null ? v.toFixed(2) : "—"}`}
                    >
                      {v != null ? v.toFixed(2) : "—"}
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
        <h2 className="font-bold mb-1">スコア分布</h2>
        <p className="text-xs text-mut mb-4">各項目の評価（1〜5）の割合。</p>
        <div className="space-y-3">
          {EVAL_ITEMS.map((item) => {
            const counts = dist[item.key] ?? [0, 0, 0, 0, 0];
            const total = counts.reduce((a, b) => a + b, 0);
            const tones = ["bg-bad/50", "bg-amber-500/50", "bg-line2", "bg-x/60", "bg-good/70"];
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="text-xs text-mut w-20 shrink-0 text-right">{item.label}</span>
                <div className="flex-1 h-5 rounded-lg overflow-hidden flex bg-panel2">
                  {counts.map((c, i) => (
                    <div
                      key={i}
                      className={tones[i]}
                      style={{ width: total > 0 ? `${(c / total) * 100}%` : "0%" }}
                      title={`${i + 1}点: ${c}件`}
                    />
                  ))}
                  {total === 0 && <div className="flex-1" />}
                </div>
                <span className="text-xs text-mut w-14 shrink-0">{total}件</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-[10px] text-mut">
          {["1", "2", "3", "4", "5"].map((n, i) => (
            <span key={n} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${["bg-bad/50", "bg-amber-500/50", "bg-line2", "bg-x/60", "bg-good/70"][i]}`} />
              {n}点
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
