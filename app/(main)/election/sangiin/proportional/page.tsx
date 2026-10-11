import Link from "next/link";
import { getServerT } from "@/lib/i18n-server";
import { getSangiinEntriesWithScores } from "@/lib/sangiin-queries";
import { computeSangiin } from "@/lib/sangiin";
import { PARTIES } from "@/data/election";
import { SANGIIN_PROPORTIONAL_SEATS } from "@/data/sangiin";
import Avatar from "@/components/Avatar";
import { num } from "@/lib/format";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerT();
  return {
    title: t("参院選 比例代表 | 第1回ツイッタラー参院選"),
    description: t("全国比例100議席。サン＝ラグ方式・非拘束名簿（党内は得票順）。"),
  };
}

const partyOf = (id: string) => PARTIES.find((p) => p.id === id);
const fmtScore = (s: number) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

export default async function SangiinProportionalPage() {
  const t = await getServerT();
  const entries = await getSangiinEntriesWithScores();
  const outcome = computeSangiin(entries);

  const propEntries = entries
    .filter((e) => e.seat_type === "proportional")
    .sort((a, b) => b.score - a.score || a.person_id.localeCompare(b.person_id));
  const byParty = new Map<string, typeof propEntries>();
  for (const e of propEntries) {
    const arr = byParty.get(e.party_id) ?? [];
    arr.push(e);
    byParty.set(e.party_id, arr);
  }
  const partiesSorted = PARTIES.slice().sort(
    (a, b) => (outcome.proportional.partySeats[b.id] ?? 0) - (outcome.proportional.partySeats[a.id] ?? 0)
  );
  const maxVotes = Math.max(...PARTIES.map((p) => Math.max(0, outcome.proportional.partyTotals[p.id] ?? 0)), 1);

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs text-mut">
          <Link href="/election/sangiin" className="text-x hover:underline">
            🏛️ {t("参院選")}
          </Link>
          <span>›</span>
          <span>{t("比例代表")}</span>
        </div>
        <h1 className="text-xl font-black mt-3">📋 {t("参院選 比例代表（全国100議席）")}</h1>
        <p className="text-sm text-mut mt-2 leading-relaxed">
          {t("比例候補者の得票合計で党の議席を配分（サン＝ラグ方式）。当選順は非拘束名簿式＝党内の得票順。")}
        </p>
        <p className="text-xs text-mut mt-2">
          {t("サン＝ラグ方式: 得票を1・3・5…で割った商の大きい順に議席を配分（小党に有利・より比例代表的）。")}
        </p>
      </section>

      {/* 党別: 得票と議席 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">📊 {t("党別の得票と議席")}</h2>
        <div className="space-y-2">
          {partiesSorted.map((p) => {
            const votes = Math.max(0, outcome.proportional.partyTotals[p.id] ?? 0);
            const seats = outcome.proportional.partySeats[p.id] ?? 0;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-sm font-bold text-right">{p.name}</span>
                <div className="flex-1 bg-panel2 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(votes / maxVotes) * 100}%`, backgroundColor: p.color, minWidth: votes > 0 ? "1.5rem" : 0 }}
                  />
                </div>
                <span className="w-20 shrink-0 text-xs text-mut text-right">{fmtScore(votes)}pt</span>
                <span className="w-14 shrink-0 text-sm font-black text-right">
                  {seats}
                  <span className="text-xs font-normal text-mut"> {t("議席")}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 当選者一覧（党別・得票順） */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">🎖️ {t("比例 当選者一覧（党内は得票順）")}</h2>
        <div className="space-y-5">
          {partiesSorted.map((p) => {
            const seats = outcome.proportional.partySeats[p.id] ?? 0;
            if (seats === 0) return null;
            const list = (byParty.get(p.id) ?? []).slice(0, seats);
            return (
              <div key={p.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className="text-xs text-mut">
                    {seats} {t("議席")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {list.map((c, i) => (
                    <Link
                      key={c.person_id}
                      href={`/person/${c.person_id}`}
                      className="flex items-center gap-2 text-sm hover:opacity-80 transition min-w-0"
                    >
                      <span className="w-5 text-xs text-mut text-right shrink-0">{i + 1}</span>
                      <Avatar name={c.name ?? ""} avatarUrl={c.avatar_url} size={22} />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-xs text-mut shrink-0">{fmtScore(c.score)}pt</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-5 text-center">
        <Link href="/election/sangiin" className="text-x hover:underline font-bold">
          ← {t("参院選トップへ")}
        </Link>
      </section>
    </div>
  );
}
