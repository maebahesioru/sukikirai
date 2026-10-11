import Link from "next/link";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import { getServerT } from "@/lib/i18n-server";
import { getElectionEntriesWithScores, getElectionStats, getElectionTrend } from "@/lib/election-queries";
import { computeElection } from "@/lib/election";
import { ELECTION } from "@/lib/constants";
import { BLOCKS, PARTIES, allDistricts } from "@/data/election";
import JapanElectionMap, { type DistrictResult } from "@/components/JapanElectionMap";
import ElectionTrendChart from "@/components/ElectionTrendChart";
import SangiinHub from "@/components/SangiinHub";
import Avatar from "@/components/Avatar";
import { num } from "@/lib/format";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t(ELECTION.title),
    description: t(
      "全登録ユーザーが289の小選挙区と10党にランダム配属され、期間中の「好き」票（嫌い票は-0.5）で議席を争う2週間イベント。比例復活あり。"
    ),
    alternates: { canonical: localePath(locale, "/election") },
    openGraph: {
      title: t(ELECTION.title),
      description: t("289選挙区+176比例・10党で議席を争う2週間イベント"),
      images: ["/og.png"],
    },
  };
}

const partyOf = (id: string) => PARTIES.find((p) => p.id === id);
const fmtScore = (s: number) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

/** 衆院/参院のタブ切替（同じページ内） */
function ElectionTabs({ active, t }: { active: "shu" | "san"; t: (s: string) => string }) {
  const base = "flex-1 text-center text-sm font-bold py-2.5 rounded-xl border transition";
  const on = "bg-x text-white border-x shadow-sm";
  const off = "bg-panel border-line text-mut hover:border-line2 hover:text-fg";
  return (
    <div className="flex gap-2">
      <Link href="/election" className={`${base} ${active === "shu" ? on : off}`}>
        🗳️ {t("衆院選")}
      </Link>
      <Link href="/election?tab=sangiin" className={`${base} ${active === "san" ? on : off}`}>
        🏛️ {t("参院選")}
      </Link>
    </div>
  );
}

export default async function ElectionPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getServerT();
  const { tab } = await searchParams;

  // 参院タブ
  if (tab === "sangiin") {
    return (
      <div className="space-y-5">
        <ElectionTabs active="san" t={t} />
        <SangiinHub />
      </div>
    );
  }

  const now = Date.now();
  const start = Date.parse(ELECTION.startIso);
  const end = Date.parse(ELECTION.endIso);
  const phase: "before" | "live" | "after" = now < start ? "before" : now <= end ? "live" : "after";
  const remainDays = Math.max(0, Math.ceil((end - now) / 86400_000));

  const entries = await getElectionEntriesWithScores();
  const stats = await getElectionStats();
  const trend = await getElectionTrend();
  const outcome = computeElection(entries);

  const partySeats = PARTIES.map((p) => ({ ...p, seats: outcome.partySeats[p.id] ?? 0 }));
  const maxSeats = Math.max(...partySeats.map((p) => p.seats), 1);
  const totalElected = partySeats.reduce((a, b) => a + b.seats, 0);
  const districts = allDistricts();
  const entryById = new Map(entries.map((e) => [e.person_id, e]));

  // 注目の接戦区（勝者と2位の差が小さい順）
  const closeRaces = [...outcome.districtRaces.values()]
    .filter((r) => r.winner && r.candidates.length >= 2 && r.winner.score > 0)
    .map((r) => ({ r, margin: (r.winner?.score ?? 0) - (r.candidates[1]?.score ?? 0) }))
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 8);

  // 選挙区ごとの当選党色（地図用）
  const districtResults: DistrictResult[] = districts.map((d) => {
    const w = outcome.districtRaces.get(d.name)?.winner;
    const wn = w ? entryById.get(w.person_id) : undefined;
    const p = w ? partyOf(w.party_id) : null;
    return {
      id: d.name,
      color: p?.color ?? "#475569",
      label: w ? `${p?.name ?? ""}・${wn?.name ?? w.person_id}` : t("—"),
    };
  });

  const headline =
    phase === "before"
      ? t("{date} に開幕！", { date: ELECTION.periodLabel.split(" 〜 ")[0] })
      : phase === "live"
        ? t("開票速報（随時更新）・残り{n}日", { n: remainDays })
        : t("確定！最終結果");

  return (
    <div className="space-y-5">
      <ElectionTabs active="shu" t={t} />
      {/* ヘッダー */}
      <section className="relative overflow-hidden bg-panel border border-line rounded-2xl p-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-x/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-x text-sm font-bold">🗳️ {t("期間限定イベント")}</div>
          <h1 className="text-3xl font-black mt-2">{t(ELECTION.title)}</h1>
          <p className="text-sm text-mut mt-2">{t("期間: {period}", { period: ELECTION.periodLabel })}</p>
          <p className="mt-4 font-black text-lg">{headline}</p>
          <p className="text-sm text-mut mt-1 leading-relaxed">
            {t(
              "全登録ユーザーが289の小選挙区・10党にランダム配属。期間中の「好き」+1票・「嫌い」-0.5票の合計で競います。小選挙区1位は当選、敗者も比例名簿から復活当選の可能性あり。"
            )}
          </p>
          <p className="text-xs text-mut mt-2">
            {t("現在の集計: {n}議席 / 465議席", { n: num(totalElected) })}
            {phase === "live" && <span className="ml-2">（{t("現時点の情勢・随時更新")}）</span>}
          </p>
          <p className="text-xs text-mut mt-1">
            {t("参加状況: {v}人が投票・候補者の{p}%が得票（合計{n}票）", {
              v: num(stats.voters),
              p: stats.totalCandidates > 0 ? Math.round((stats.votedPeople / stats.totalCandidates) * 100) : 0,
              n: num(stats.totalVotes),
            })}
          </p>
        </div>
      </section>

      {/* 議席グラフ */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">📊 {t("議席グラフ")}</h2>
        <div className="space-y-2">
          {partySeats
            .slice()
            .sort((a, b) => b.seats - a.seats)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Link
                  href={`/election/party/${p.id}`}
                  className="w-20 shrink-0 text-sm font-bold text-right hover:text-x"
                >
                  {p.name}
                </Link>
                <div className="flex-1 bg-panel2 rounded-full h-6 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(p.seats / maxSeats) * 100}%`, backgroundColor: p.color, minWidth: p.seats > 0 ? "1.5rem" : 0 }}
                  />
                </div>
                <span className="w-12 shrink-0 text-sm font-black">{p.seats}</span>
              </div>
            ))}
        </div>
      </section>

      {/* 党勢の推移 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">📈 {t("党勢の推移")}</h2>
        <ElectionTrendChart rows={trend} note={t("データ収集中（毎時更新）")} />
      </section>

      {/* 注目の接戦区 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">⚔️ {t("注目の接戦区")}</h2>
        <div className="space-y-2.5">
          {closeRaces.map(({ r, margin }) => {
            const w = r.winner;
            const second = r.candidates[1];
            if (!w || !second) return null;
            return (
              <div key={r.districtId} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/election/district/${encodeURIComponent(r.districtId)}`}
                  className="text-x hover:underline font-bold shrink-0 max-w-28 truncate"
                >
                  {r.districtId}
                </Link>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar name={w.name ?? ""} avatarUrl={w.avatar_url} size={20} />
                  <span className="truncate">{w.name}</span>
                  <span className="font-black shrink-0">{fmtScore(w.score)}</span>
                </div>
                <span className="text-mut text-xs shrink-0">vs</span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Avatar name={second.name ?? ""} avatarUrl={second.avatar_url} size={20} />
                  <span className="truncate">{second.name}</span>
                  <span className="shrink-0 text-mut">{fmtScore(second.score)}</span>
                </div>
                <span className="ml-auto text-xs text-mut shrink-0">{t("差 {n}pt", { n: fmtScore(margin) })}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 日本地図 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">🗾 {t("日本地図（289選挙区）")}</h2>
        <JapanElectionMap results={districtResults} />
      </section>

      {/* ブロック概要 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">🗾 {t("比例ブロック（11）")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {BLOCKS.map((b) => {
            const bo = outcome.blocks.get(b.id);
            const top = Object.entries(bo?.partySeats ?? {}).sort((a, c) => c[1] - a[1])[0];
            const tp = top ? partyOf(top[0]) : null;
            return (
              <Link
                key={b.id}
                href={`/election/block/${b.id}`}
                className="border border-line rounded-xl p-3 hover:border-line2 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{b.name}</span>
                  <span className="text-xs text-mut">{t("{n}議席", { n: b.seats })}</span>
                </div>
                {tp && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-mut">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tp.color }} />
                    {tp.name} {top[1]}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* 小選挙区 結果一覧 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">🏛️ {t("小選挙区（289）— 現在の首位")}</h2>
        {BLOCKS.map((b) => {
          const bd = districts.filter((d) => d.blockId === b.id);
          return (
            <div key={b.id} className="mb-5 last:mb-0">
              <h3 className="text-sm font-bold text-mut mb-2">
                {b.name}（{bd.length}区）
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {bd.map((d) => {
                  const race = outcome.districtRaces.get(d.name);
                  const w = race?.winner;
                  const wn = w ? entryById.get(w.person_id) : undefined;
                  const wp = w ? partyOf(w.party_id) : null;
                  return (
                    <Link
                      key={d.name}
                      href={`/election/district/${encodeURIComponent(d.name)}`}
                      className="border border-line rounded-lg px-2.5 py-1.5 hover:border-line2 transition flex items-center gap-2 min-w-0"
                      style={wp ? { borderLeftColor: wp.color, borderLeftWidth: 3 } : undefined}
                    >
                      <span className="text-xs font-bold shrink-0">{d.id}</span>
                      {wn && <Avatar name={wn.name} avatarUrl={wn.avatar_url} size={16} />}
                      <span className="text-xs text-mut truncate">{wn ? wn.name : t("—")}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>

      {/* ルール */}
      <section className="bg-panel border border-line rounded-2xl p-5 text-sm text-mut leading-relaxed">
        <h2 className="font-bold text-txt mb-2">{t("ルール")}</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t("全登録ユーザーが289小選挙区のどれか・10党のどれかにランダム配属（名簿順位もランダム）")}</li>
          <li>{t("得票 = 期間中の「好き」+1票、「嫌い」-0.5票（毎日投票できるほど有利）")}</li>
          <li>{t("小選挙区 = 1位が当選（289議席）")}</li>
          <li>{t("比例 = 党のブロック得票でドント式配分→党内名簿順で当選。小選挙区で負けても名簿が上位なら復活当選（176議席）")}</li>
          <li>{t("期間終了（10/24 23:59）時点の数字で確定します")}</li>
        </ul>
      </section>
    </div>
  );
}
