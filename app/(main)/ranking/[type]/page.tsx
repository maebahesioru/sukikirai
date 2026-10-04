import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRanking, type RankingType } from "@/lib/queries";
import RankTable from "@/components/RankTable";

export const dynamic = "force-dynamic";

const TYPES: Record<RankingType, { label: string; desc: string }> = {
  popularity: { label: "好感度", desc: "好き率が高い順。1票以上集めた人物が対象です。" },
  unpopular: { label: "不人気", desc: "嫌い率が高い順。1票以上集めた人物が対象です。" },
  trending: { label: "トレンド", desc: "過去7日間の投票数ランキング。今話題の人をチェック。" },
  score: { label: "総合評価", desc: "8項目評価の平均点が高い順。5人以上が評価した人物が対象です。" },
  lowscore: { label: "低評価", desc: "8項目評価の平均点が低い順。5人以上が評価した人物が対象です。" },
};
const ORDER: RankingType[] = ["popularity", "unpopular", "trending", "score", "lowscore"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  const t = TYPES[type as RankingType];
  if (!t) return { title: "ランキング" };
  return {
    title: `${t.label}ランキング`,
    description: t.desc,
    alternates: { canonical: `/ranking/${type}` },
  };
}

export default async function RankingPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!(type in TYPES)) notFound();
  const kind = type as RankingType;
  const rows = await getRanking(kind, 50);

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h1 className="text-2xl font-black mb-1">ランキング</h1>
        <p className="text-sm text-mut">{TYPES[kind].desc}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {ORDER.map((t) => (
            <Link
              key={t}
              href={`/ranking/${t}`}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                t === kind
                  ? "bg-x text-white border-x"
                  : "bg-panel2 text-mut border-line hover:text-txt"
              }`}
            >
              {TYPES[t].label}
            </Link>
          ))}
        </div>
      </section>

      <RankTable rows={rows} kind={kind} />

      <p className="text-xs text-mut text-center">
        ※ランキングは書き込みのたびに更新されます。投票は1日1回、評価も毎日書き込めます。
      </p>
    </div>
  );
}
