import Link from "next/link";
import { notFound } from "next/navigation";
import { getElectionEntriesWithScores } from "@/lib/election-queries";
import { computeElection } from "@/lib/election";
import { ELECTION } from "@/lib/constants";
import { PARTIES } from "@/data/election";
import Avatar from "@/components/Avatar";
import { getServerT } from "@/lib/i18n-server";
import { num } from "@/lib/format";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const fmtScore = (s: number) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const party = PARTIES.find((p) => p.id === id);
  if (!party) return { title: "Not Found" };
  return {
    title: `${party.name} | 第1回ツイッタラー衆院選`,
    description: `${party.name}の党情報。議席・党首・公約・主な党員。`,
  };
}

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const party = PARTIES.find((p) => p.id === id);
  if (!party) notFound();
  const t = await getServerT();

  const entries = await getElectionEntriesWithScores();
  const outcome = computeElection(entries);
  const mine = entries.filter((e) => e.party_id === id);
  const sorted = mine.slice().sort((a, b) => b.score - a.score || a.person_id.localeCompare(b.person_id));
  const leader = sorted[0];
  const top = sorted.slice(0, 10);
  const seats = outcome.partySeats[id] ?? 0;
  let propCount = 0;
  for (const b of outcome.blocks.values()) {
    propCount += b.proportional.filter((x) => x.party_id === id).length;
  }
  const entryById = new Map(entries.map((e) => [e.person_id, e]));
  const distCount = [...outcome.districtWinners.keys()].filter((pid) => entryById.get(pid)?.party_id === id).length;

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 text-xs text-mut">
          <Link href="/election" className="text-x hover:underline">
            🗳️ {t(ELECTION.title)}
          </Link>
          <span>›</span>
          <span>{party.name}</span>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: party.color }} />
          <h1 className="text-xl font-black">{party.name}</h1>
          <span className="ml-auto text-sm font-black shrink-0">
            {seats}
            <span className="text-xs font-normal text-mut"> {t("議席")}</span>
          </span>
        </div>
        <p className="text-xs text-mut mt-2">
          {t("小選挙区 {d}・比例 {p}", { d: num(distCount), p: num(propCount) })}・{t("党員 {n}人", { n: num(mine.length) })}
        </p>
      </section>

      {leader && (
        <section className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-3">👑 {t("党首")}</h2>
          <Link href={`/person/${leader.person_id}`} className="flex items-center gap-3 hover:opacity-80 transition">
            <Avatar name={leader.name} avatarUrl={leader.avatar_url} size={44} />
            <div className="min-w-0">
              <div className="font-bold truncate">{leader.name}</div>
              <div className="text-xs text-mut truncate">{leader.district_id}</div>
            </div>
            <span className="ml-auto font-black shrink-0">
              {fmtScore(leader.score)}
              <span className="text-xs font-normal text-mut">pt</span>
            </span>
          </Link>
        </section>
      )}

      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">📜 {t("公約")}</h2>
        <ul className="space-y-2">
          {party.manifesto.map((m) => (
            <li key={m} className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: party.color }} />
              {m}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">👥 {t("主な党員（得票順）")}</h2>
        <div className="space-y-2">
          {top.map((m, i) => (
            <Link
              key={m.person_id}
              href={`/person/${m.person_id}`}
              className="flex items-center gap-2.5 text-sm hover:opacity-80 transition"
            >
              <span className="w-5 text-xs text-mut text-right shrink-0">{i + 1}</span>
              <Avatar name={m.name} avatarUrl={m.avatar_url} size={28} />
              <span className="truncate min-w-0">{m.name}</span>
              <span className="text-xs text-mut truncate shrink-0 max-w-28">{m.district_id}</span>
              <span className="ml-auto font-bold shrink-0">{fmtScore(m.score)}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
