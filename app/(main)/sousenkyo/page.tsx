import Link from "next/link";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n-server";
import { getSousenkyoArchive } from "@/lib/queries";
import { SOUSENKYO } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import EmojiText from "@/components/EmojiText";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t("第1回ツイッタラー総選挙 アーカイブ（中止）"),
    description: t("中止となった第1回ツイッタラー総選挙の中止時点の最終結果アーカイブです。"),
    alternates: { canonical: localePath(locale, "/sousenkyo") },
  };
}

export default async function SousenkyoPage() {
  const t = await getServerT();
  const { rows, totalVotes, voters } = await getSousenkyoArchive(50);
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-8 text-center">
        <p className="text-4xl">🗳️</p>
        <h1 className="text-2xl font-black mt-3 leading-snug">
          {t("第1回ツイッタラー総選挙は中止となりました")}
        </h1>
        <p className="text-sm text-mut mt-4 leading-relaxed">
          {t("開催期間 {period}。運営判断により中止し、新イベント「第1回ツイッタラー衆院選」に移行しました。", {
            period: SOUSENKYO.periodLabel,
          })}
        </p>
        <Link
          href="/election"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-x text-white font-bold hover:opacity-90 transition"
        >
          🗳️ {t("第1回ツイッタラー衆院選を見る")}
        </Link>
      </section>

      <section className="bg-panel border border-line rounded-2xl p-6">
        <h2 className="font-black text-lg">
          📜 {t("アーカイブ: 中止時点の最終結果（TOP{limit}）", { limit: 50 })}
        </h2>
        <p className="text-xs text-mut mt-1">
          {t("総投票 {votes}票・{people}人が参加", { votes: num(totalVotes), people: num(voters) })}
        </p>
        {rows.length === 0 ? (
          <p className="text-sm text-mut mt-4">{t("まだデータがありません")}</p>
        ) : (
          <div className="mt-4 space-y-1">
            {rows.map((r, i) => (
              <Link
                key={r.id}
                href={`/person/${r.id}`}
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-panel2 transition"
              >
                <span
                  className={`w-7 text-center font-black tabular-nums ${i === 0 ? "text-gold" : i < 3 ? "text-txt" : "text-mut"}`}
                >
                  {i + 1}
                </span>
                <Avatar name={r.name} avatarUrl={r.avatar_url} size={32} />
                <span className="font-bold truncate">
                  <EmojiText text={r.name} />
                </span>
                <span className="ml-auto text-sm tabular-nums text-mut shrink-0">
                  {num(r.votes)}
                  {t("票")}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
