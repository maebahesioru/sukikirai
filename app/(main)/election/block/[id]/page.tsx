import Link from "next/link";
import { notFound } from "next/navigation";
import { getElectionEntriesByBlock } from "@/lib/election-queries";
import { computeElection } from "@/lib/election";
import { ELECTION } from "@/lib/constants";
import { BLOCKS, PARTIES } from "@/data/election";
import Avatar from "@/components/Avatar";
import EmojiText from "@/components/EmojiText";
import { getServerT } from "@/lib/i18n-server";
import { num } from "@/lib/format";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const partyOf = (id: string) => PARTIES.find((p) => p.id === id);
const fmtScore = (s: number) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const block = BLOCKS.find((b) => b.id === id);
  if (!block) return { title: "比例ブロック | 第1回ツイッタラー衆院選" };
  return {
    title: `${block.name}ブロック 開票状況 | 第1回ツイッタラー衆院選`,
    description: `${block.name}ブロック（定数${block.seats}）の比例名簿と当落状況。`,
  };
}

export default async function BlockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const block = BLOCKS.find((b) => b.id === id);
  if (!block) notFound();
  const t = await getServerT();

  const entries = await getElectionEntriesByBlock(block.id);
  const outcome = computeElection(entries);
  const bo = outcome.blocks.get(block.id);
  if (!bo) notFound();

  const phase = Date.now() <= Date.parse(ELECTION.endIso) ? "live" : "after";
  const partiesSorted = PARTIES.slice().sort(
    (a, b) => (bo.partySeats[b.id] ?? 0) - (bo.partySeats[a.id] ?? 0)
  );

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs text-mut">
          <Link href="/election" className="text-x hover:underline">
            🗳️ {t(ELECTION.title)}
          </Link>
          <span>›</span>
          <span>{t("比例ブロック")}</span>
        </div>
        <h1 className="text-2xl font-black mt-2">{block.name}ブロック</h1>
        <p className="text-sm text-mut mt-1">
          {t("定数{n}議席", { n: block.seats })}・{phase === "live" ? t("開票速報（随時更新）") : t("確定")}
        </p>
      </section>

      {/* 党別配分 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">📊 {t("党別 得票と議席")}</h2>
        <div className="space-y-1.5">
          {partiesSorted.map((p) => (
            <div key={p.id} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 font-bold text-right">{p.name}</span>
              <div className="flex-1 bg-panel2 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, ((bo.partySeats[p.id] ?? 0) / Math.max(1, block.seats)) * 100)}%`,
                    backgroundColor: p.color,
                  }}
                />
              </div>
              <span className="w-10 shrink-0 font-black text-right">{bo.partySeats[p.id] ?? 0}</span>
              <span className="w-24 shrink-0 text-xs text-mut text-right">
                {fmtScore(bo.partyTotals[p.id] ?? 0)}pt
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-mut mt-3">
          {t("党の得票（党員の好き+1・嫌い-0.5の合計）でドント式に配分。名簿上位から当選（小選挙区当選者は名簿から除外）。")}
        </p>
        <p className="text-xs text-mut mt-1">
          {t("※ 比例復活には惜敗率10%以上（小選挙区の勝者得票の10%以上）が必要です。")}
        </p>
      </section>

      {/* 党別名簿 */}
      {partiesSorted.map((p) => {
        const seats = bo.partySeats[p.id] ?? 0;
        const electedIds = new Set(
          bo.proportional.filter((x) => x.party_id === p.id).map((x) => x.person_id)
        );
        const ranksElected = bo.proportional
          .filter((x) => x.party_id === p.id)
          .map((x) => x.list_rank);
        const maxElectedRank = ranksElected.length ? Math.max(...ranksElected) : 0;
        const limit = Math.max(maxElectedRank + 2, seats + 2);
        const list = entries
          .filter((e) => e.party_id === p.id)
          .sort((a, b) => a.list_rank - b.list_rank)
          .filter((e) => e.list_rank <= limit);
        if (list.length === 0) return null;
        return (
          <section key={p.id} className="bg-panel border border-line rounded-2xl p-4">
            <h2 className="font-bold mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
              <span className="text-xs font-normal text-mut">
                {t("{n}議席", { n: seats })}・{t("名簿{total}人", { total: entries.filter((e) => e.party_id === p.id).length })}
              </span>
            </h2>
            <div className="space-y-0.5">
              {list.map((e) => {
                const isWinner = outcome.districtWinners.has(e.person_id);
                const isProp = electedIds.has(e.person_id);
                return (
                  <div
                    key={e.person_id}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm ${
                      isWinner || isProp ? "bg-xsoft/50" : "hover:bg-panel2"
                    } transition`}
                  >
                    <span className="w-8 text-center text-xs font-bold text-mut shrink-0">{e.list_rank}位</span>
                    <Avatar name={e.name} avatarUrl={e.avatar_url} size={24} />
                    <Link href={`/person/${e.person_id}`} className="truncate flex-1 hover:text-x transition">
                      <EmojiText text={e.name} />
                    </Link>
                    <Link
                      href={`/election/district/${encodeURIComponent(e.district_id)}`}
                      className="text-xs text-mut hover:text-x transition shrink-0 hidden sm:block"
                    >
                      {e.district_id}
                    </Link>
                    <span className="text-xs text-mut shrink-0 w-16 text-right">{fmtScore(e.score)}pt</span>
                    <span className="shrink-0 w-20 text-right">
                      {isWinner ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-x text-white">{t("小選挙区当選")}</span>
                      ) : isProp ? (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-good text-white">{t("比例当選")}</span>
                      ) : (
                        <span className="text-[11px] text-mut">{t("次点")}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
