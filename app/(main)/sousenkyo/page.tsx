import Link from "next/link";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import type { Metadata } from "next";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t("第1回ツイッタラー総選挙 中止のお知らせ"),
    description: t(
      "第1回ツイッタラー総選挙は中止となりました。代わりに第1回ツイッタラー衆院選を開催中です。"
    ),
    alternates: { canonical: localePath(locale, "/sousenkyo") },
  };
}

export default async function SousenkyoPage() {
  const t = await getServerT();
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-8 text-center">
        <p className="text-4xl">🗳️</p>
        <h1 className="text-2xl font-black mt-3 leading-snug">
          {t("第1回ツイッタラー総選挙は中止となりました")}
        </h1>
        <p className="text-sm text-mut mt-4 leading-relaxed">
          {t(
            "運営判断により総選挙は中止し、新イベント「第1回ツイッタラー衆院選」に移行しました。投票はこれまで通りそのまま、衆院選の得票としてカウントされます。"
          )}
        </p>
        <Link
          href="/election"
          className="inline-block mt-6 px-6 py-3 rounded-xl bg-x text-white font-bold hover:opacity-90 transition"
        >
          🗳️ {t("第1回ツイッタラー衆院選を見る")}
        </Link>
      </section>
    </div>
  );
}
