import Link from "next/link";
import { notFound } from "next/navigation";
import { getSangiinEntriesByDistrict } from "@/lib/sangiin-queries";
import { PARTIES } from "@/data/election";
import { SANGIIN_DISTRICTS } from "@/data/sangiin";
import Avatar from "@/components/Avatar";
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
  const districtId = decodeURIComponent(id);
  const d = SANGIIN_DISTRICTS.find((x) => x.id === districtId);
  return {
    title: `${d?.name ?? districtId} 開票状況 | 第1回ツイッタラー参院選`,
    description: `${d?.name ?? districtId}の開票状況。定数${d?.seats ?? "?"}・上位${d?.seats ?? "?"}人が当選。`,
  };
}

export default async function SangiinDistrictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const districtId = decodeURIComponent(id);
  const meta = SANGIIN_DISTRICTS.find((x) => x.id === districtId);
  if (!meta) notFound();
  const t = await getServerT();
  const cands = await getSangiinEntriesByDistrict(districtId);

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs text-mut">
          <Link href="/election?tab=sangiin" className="text-x hover:underline">
            🏛️ {t("参院選")}
          </Link>
          <span>›</span>
          <span>{meta.name}</span>
        </div>
        <h1 className="text-xl font-black mt-3">{meta.name}</h1>
        <p className="text-sm text-mut mt-1">
          {t("定数{n}議席・上位{n}人が当選", { n: num(meta.seats) })}
        </p>
        <p className="text-xs text-mut mt-2">{t("好き+1票・嫌い-0.5票の合計で競う参院選挙区レース。")}</p>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">📋 {t("候補者（得票順）")}</h2>
        <div className="space-y-2.5">
          {cands.map((c, i) => {
            const p = partyOf(c.party_id);
            const isWinner = i < meta.seats;
            return (
              <div key={c.person_id} className={`flex items-center gap-2.5 ${isWinner ? "" : "opacity-80"}`}>
                <span className="w-6 text-xs text-mut text-right shrink-0 font-bold">{i + 1}</span>
                <Link href={`/person/${c.person_id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition">
                  <Avatar name={c.name ?? ""} avatarUrl={c.avatar_url} size={28} />
                  <span className="truncate font-bold">{c.name}</span>
                </Link>
                {p && (
                  <span className="text-xs shrink-0 inline-flex items-center gap-1 text-mut">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                )}
                <div className="text-right shrink-0 ml-auto">
                  <div className="text-sm font-black">
                    {fmtScore(c.score)}
                    <span className="text-xs font-normal text-mut">pt</span>
                  </div>
                  <div className="text-[11px] text-mut">
                    {t("好き{n}", { n: num(c.likes) })} / {t("嫌い{n}", { n: num(c.dislikes) })}
                  </div>
                </div>
                {isWinner && (
                  <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full bg-x text-white whitespace-nowrap">
                    {t("当選")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-5 text-center">
        <Link href="/election?tab=sangiin" className="text-x hover:underline font-bold">
          ← {t("参院選トップへ")}
        </Link>
      </section>
    </div>
  );
}
