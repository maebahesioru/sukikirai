import Link from "next/link";
import { getServerT } from "@/lib/i18n-server";
import { getSangiinEntriesWithScores } from "@/lib/sangiin-queries";
import { computeSangiin } from "@/lib/sangiin";
import { ELECTION } from "@/lib/constants";
import { PARTIES, allDistricts } from "@/data/election";
import {
  SANGIIN_DISTRICTS,
  SANGIIN_TOTAL_SEATS,
  SANGIIN_DISTRICT_SEATS,
  SANGIIN_PROPORTIONAL_SEATS,
} from "@/data/sangiin";
import JapanElectionMap, { type DistrictResult } from "@/components/JapanElectionMap";
import Avatar from "@/components/Avatar";
import { num } from "@/lib/format";

const partyOf = (id: string) => PARTIES.find((p) => p.id === id);
const fmtScore = (s: number) => (Number.isInteger(s) ? String(s) : s.toFixed(1));

/** 衆院の区名 → 参院の選挙区ID（合区対応） */
function sangiinOf(name: string): string {
  const m = name.match(/^(.+?)第\d+区$/);
  const pref = m ? m[1] : name;
  if (pref === "鳥取県" || pref === "島根県") return "鳥取・島根";
  if (pref === "徳島県" || pref === "高知県") return "徳島・高知";
  return pref;
}

export default async function SangiinHub() {
  const t = await getServerT();
  const entries = await getSangiinEntriesWithScores();
  const outcome = computeSangiin(entries);

  const partySeats = PARTIES.map((p) => ({ ...p, seats: outcome.partySeatsTotal[p.id] ?? 0 }));
  const maxSeats = Math.max(...partySeats.map((p) => p.seats), 1);

  // 選挙区ごとの「最多当選の党」→ 都道府県色（合区は両県に反映）
  const prefColor = new Map<string, { color: string; label: string }>();
  for (const race of outcome.districtRaces.values()) {
    const byParty = new Map<string, number>();
    for (const w of race.winners) byParty.set(w.party_id, (byParty.get(w.party_id) ?? 0) + 1);
    const top = [...byParty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const color = top ? partyOf(top[0])?.color ?? "#475569" : "#475569";
    const label = top ? `${partyOf(top[0])?.name ?? ""}・${race.winners[0]?.name ?? ""}` : t("—");
    const prefs =
      race.districtId === "鳥取・島根"
        ? ["鳥取県", "島根県"]
        : race.districtId === "徳島・高知"
          ? ["徳島県", "高知県"]
          : [race.districtId];
    for (const pref of prefs) prefColor.set(pref, { color, label });
  }
  const districtResults: DistrictResult[] = allDistricts().map((d) => {
    const pc = prefColor.get(sangiinOf(d.name));
    return { id: d.name, color: pc?.color ?? "#475569", label: pc?.label ?? t("—") };
  });

  // 区一覧（当選者トップ付き）
  const districtList = SANGIIN_DISTRICTS.map((d) => {
    const race = outcome.districtRaces.get(d.id);
    const w = race?.winners[0];
    const byParty = new Map<string, number>();
    for (const x of race?.winners ?? []) byParty.set(x.party_id, (byParty.get(x.party_id) ?? 0) + 1);
    const top = [...byParty.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    return { d, w, topParty: top ? top[0] : null };
  }).sort((a, b) => b.d.seats - a.d.seats);

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <section className="relative overflow-hidden bg-panel border border-line rounded-2xl p-6">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-x/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs text-mut">
            <Link href="/election" className="text-x hover:underline">
              🗳️ {t(ELECTION.title)}
            </Link>
            <span>›</span>
            <span>{t("参院選")}</span>
          </div>
          <div className="flex items-center gap-2 text-x text-sm font-bold mt-3">🏛️ {t("衆参同時選挙")}</div>
          <h1 className="text-3xl font-black mt-2">{t("第1回ツイッタラー参院選")}</h1>
          <p className="text-sm text-mut mt-2 leading-relaxed">
            {t("45選挙区+比例100・計248議席。比例はサン＝ラグ方式・非拘束名簿（党内は得票順）。")}
          </p>
          <p className="text-xs text-mut mt-1">
            {t("投票は、その人が立候補している選挙（衆院選または参院選）に反映されます。")}
          </p>
          <p className="text-xs text-mut mt-2">
            {t("現在の集計: {n}議席 / {total}議席", { n: num(outcome.totalElected), total: num(SANGIIN_TOTAL_SEATS) })}
          </p>
        </div>
      </section>

      {/* 議席グラフ */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-4">📊 {t("議席グラフ（区+比例）")}</h2>
        <div className="space-y-2">
          {partySeats
            .slice()
            .sort((a, b) => b.seats - a.seats)
            .map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <Link href={`/election/party/${p.id}`} className="w-20 shrink-0 text-sm font-bold text-right hover:text-x">
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
        <p className="text-xs text-mut mt-3">
          {t("選挙区{d}議席＋比例{p}議席。比例の配分はサン＝ラグ方式。", { d: num(SANGIIN_DISTRICT_SEATS), p: num(SANGIIN_PROPORTIONAL_SEATS) })}
        </p>
      </section>

      {/* 地図 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">🗾 {t("日本地図（45選挙区・最多当選の党で色分け）")}</h2>
        <JapanElectionMap results={districtResults} />
      </section>

      {/* 選挙区一覧 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">🏛️ {t("参院選 選挙区一覧（定数順）")}</h2>
        <div className="space-y-2">
          {districtList.map(({ d, w, topParty }) => (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              <Link
                href={`/election/sangiin/district/${encodeURIComponent(d.id)}`}
                className="text-x hover:underline font-bold shrink-0 max-w-40 truncate"
              >
                {d.name}
              </Link>
              <span className="text-xs text-mut shrink-0">{t("定数{n}", { n: num(d.seats) })}</span>
              {w && (
                <div className="flex items-center gap-1.5 min-w-0 ml-auto">
                  {topParty && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: partyOf(topParty)?.color }} />}
                  <Avatar name={w.name ?? ""} avatarUrl={w.avatar_url} size={20} />
                  <span className="truncate">{w.name}</span>
                  <span className="font-black shrink-0">{fmtScore(w.score)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 比例 */}
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h2 className="font-bold mb-3">📋 {t("比例代表（100議席）")}</h2>
        <div className="space-y-1.5">
          {PARTIES.slice()
            .sort((a, b) => (outcome.proportional.partyTotals[b.id] ?? 0) - (outcome.proportional.partyTotals[a.id] ?? 0))
            .map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="w-20 shrink-0 font-bold">{p.name}</span>
                <span className="text-mut text-xs">{fmtScore(outcome.proportional.partyTotals[p.id] ?? 0)}pt</span>
                <span className="ml-auto font-black">{outcome.proportional.partySeats[p.id] ?? 0}<span className="text-xs font-normal text-mut"> {t("議席")}</span></span>
              </div>
            ))}
        </div>
        <Link href="/election/sangiin/proportional" className="inline-block mt-3 text-sm text-x hover:underline">
          {t("比例の詳細・当選者一覧へ →")}
        </Link>
        <p className="text-xs text-mut mt-2">
          {t("サン＝ラグ方式: 得票を1・3・5…で割った商の大きい順に議席を配分（小党に有利・より比例代表的）。")}
        </p>
      </section>

      {/* 相互リンク */}
      <section className="bg-panel border border-line rounded-2xl p-5 text-center">
        <Link href="/election" className="text-x hover:underline font-bold">
          🗳️ {t("衆院選（289小選挙区+176比例）を見る")}
        </Link>
      </section>
    </div>
  );
}
