import Link from "next/link";
import { notFound } from "next/navigation";
import { getElectionEntriesByDistrict } from "@/lib/election-queries";
import { ELECTION } from "@/lib/constants";
import { PARTIES, BLOCKS } from "@/data/election";
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
  const district = decodeURIComponent(id);
  return {
    title: `${district} 開票状況 | 第1回ツイッタラー衆院選`,
    description: `${district}の開票状況。好き+1票・嫌い-0.5票で競う小選挙区レース。`,
  };
}

export default async function DistrictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const districtId = decodeURIComponent(id);
  const t = await getServerT();
  const cands = await getElectionEntriesByDistrict(districtId);
  if (cands.length === 0) notFound();

  const phase = Date.now() <= Date.parse(ELECTION.endIso) ? "live" : "after";
  const block = BLOCKS.find((b) => b.id === cands[0].block_id);
  const winner = cands[0];

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs text-mut">
          <Link href="/election" className="text-x hover:underline">
            🗳️ {t(ELECTION.title)}
          </Link>
          {block && (
            <>
              <span>›</span>
              <Link href={`/election/block/${block.id}`} className="text-x hover:underline">
                {block.name}ブロック
              </Link>
            </>
          )}
        </div>
        <h1 className="text-2xl font-black mt-2">{districtId}</h1>
        <p className="text-sm text-mut mt-1">
          {phase === "live" ? t("開票速報（随時更新）") : t("確定")}・{t("候補者{n}人", { n: cands.length })}
        </p>
        <p className="text-xs text-mut mt-2">
          {t("得票 = 好き+1・嫌い-0.5。1位が当選（残り{day}日）", {
            day: Math.max(0, Math.ceil((Date.parse(ELECTION.endIso) - Date.now()) / 86400_000)),
          })}
        </p>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-4">
        <div className="space-y-1">
          {cands.map((c, i) => {
            const p = partyOf(c.party_id);
            const isWinner = phase === "after" ? i === 0 : i === 0;
            return (
              <div
                key={c.person_id}
                className={`flex items-center gap-3 p-2 rounded-xl ${i === 0 ? "bg-xsoft/60 border border-x/30" : "hover:bg-panel2"} transition`}
              >
                <span className={`w-6 text-center text-sm font-black shrink-0 ${i === 0 ? "text-x" : "text-mut/60"}`}>
                  {i + 1}
                </span>
                <Avatar name={c.name} avatarUrl={c.avatar_url} size={32} />
                <div className="min-w-0 flex-1">
                  <Link href={`/person/${c.person_id}`} className="text-sm font-medium truncate hover:text-x transition block">
                    <EmojiText text={c.name} />
                  </Link>
                  <div className="flex items-center gap-1.5 text-xs text-mut">
                    {p && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    )}
                    <span>・{t("名簿{rank}位", { rank: c.list_rank })}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black">{fmtScore(c.score)}<span className="text-xs font-normal text-mut">pt</span></div>
                  <div className="text-[11px] text-mut">
                    {t("好き{n}", { n: num(c.likes) })} / {t("嫌い{n}", { n: num(c.dislikes) })}
                  </div>
                </div>
                {isWinner && (
                  <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full bg-x text-white whitespace-nowrap">
                    {phase === "after" ? t("当選") : t("当選圏")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-mut">
        {t("期間終了（10/24 23:59）時点の得票で確定します。毎日投票するほど推しが有利。")}
      </p>
    </div>
  );
}
