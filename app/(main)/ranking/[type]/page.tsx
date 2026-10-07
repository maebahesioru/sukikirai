import Link from "next/link";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRanking, type RankingType } from "@/lib/queries";
import RankTable from "@/components/RankTable";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

const TYPES: Record<RankingType, { label: string; desc: string }> = {
  popularity: { label: "好感度", desc: "好き率が高い順。20票以上集めた人物が対象です。" },
  unpopular: { label: "不人気", desc: "嫌い率が高い順。20票以上集めた人物が対象です。" },
  daily: { label: "24時間", desc: "過去24時間の投票数ランキング。今日動いてる人をチェック。" },
  trending: { label: "トレンド", desc: "過去7日間の投票数ランキング。今話題の人をチェック。" },
  score: { label: "総合評価", desc: "8項目評価の平均点が高い順。10人以上が評価した人物が対象です。" },
  lowscore: { label: "低評価", desc: "8項目評価の平均点が低い順。10人以上が評価した人物が対象です。" },
};
const ORDER: RankingType[] = ["daily", "trending", "popularity", "unpopular", "score", "lowscore"];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  const { type } = await params;
  const item = TYPES[type as RankingType];
  if (!item) return { title: t("ランキング") };
  return {
    title: t("{label}ランキング", { label: t(item.label) }),
    description: t(item.desc),
    alternates: { canonical: localePath(locale, `/ranking/${type}`) },
  };
}

export default async function RankingPage({ params }: { params: Promise<{ type: string }> }) {
  const t = await getServerT();
  const { type } = await params;
  if (!(type in TYPES)) notFound();
  const kind = type as RankingType;
  const rows = await getRanking(kind, 50);

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h1 className="text-2xl font-black mb-1">{t("ランキング")}</h1>
        <p className="text-sm text-mut">{t(TYPES[kind].desc)}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {ORDER.map((k) => (
            <Link
              key={k}
              href={`/ranking/${k}`}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                k === kind
                  ? "bg-x text-white border-x"
                  : "bg-panel2 text-mut border-line hover:text-txt"
              }`}
            >
              {t(TYPES[k].label)}
            </Link>
          ))}
        </div>
      </section>

      <RankTable rows={rows} kind={kind} />

      <p className="text-xs text-mut text-center">
        {t("※ランキングは書き込みのたびに更新されます。投票は1日1回、評価も毎日書き込めます。")}
      </p>
    </div>
  );
}
