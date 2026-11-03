import type { Metadata } from "next";
import Link from "next/link";
import { localePath } from "@/lib/i18n-core";
import { getLocale, getServerT } from "@/lib/i18n-server";
import { LIVE_EVENTS, PAST_EVENTS } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  return {
    title: t("イベント"),
    description: t("ツイッタラー世論調査で開催中・過去のイベント一覧。"),
    alternates: { canonical: localePath(locale, "/events") },
  };
}

function Card({
  href,
  emoji,
  title,
  periodLabel,
  summary,
  cta,
  badge,
  t,
}: {
  href: string;
  emoji: string;
  title: string;
  periodLabel: string;
  summary: string;
  cta: string;
  badge?: string;
  t: (s: string) => string;
}) {
  return (
    <Link
      href={href}
      className="block bg-panel border border-line rounded-2xl p-5 hover:border-line2 transition group"
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <h2 className="font-bold group-hover:text-x transition">{t(title)}</h2>
        {badge && (
          <span className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full bg-xsoft text-x border border-x/40">
            {t(badge)}
          </span>
        )}
      </div>
      <div className="text-xs text-mut mt-1">{periodLabel}</div>
      <p className="text-sm text-mut mt-2 leading-relaxed">{t(summary)}</p>
      <div className="text-xs text-x font-bold mt-3">{t(cta)} →</div>
    </Link>
  );
}

export default async function EventsPage() {
  const t = await getServerT();
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black">{t("イベント")}</h1>
        <p className="text-sm text-mut mt-1">{t("開催中のイベントと、過去に開催したイベントの一覧です。")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-mut">{t("開催中")}</h2>
        {LIVE_EVENTS.length === 0 ? (
          <p className="text-sm text-mut">{t("現在開催中のイベントはありません")}</p>
        ) : (
          LIVE_EVENTS.map((e) => <Card key={e.slug} {...e} t={t} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-mut">{t("過去のイベント")}</h2>
        {PAST_EVENTS.map((e) => (
          <Card key={e.slug} {...e} t={t} />
        ))}
      </section>
    </div>
  );
}
