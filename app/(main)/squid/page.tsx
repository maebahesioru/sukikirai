import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale, getServerT } from "@/lib/i18n-server";
import { getSquidState } from "@/lib/squid-queries";
import { SQUID } from "@/lib/squid";
import { SITE_NAME } from "@/lib/site";
import SquidHub from "@/components/SquidHub";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getServerT();
  const desc = t(
    "登録スレッド全員参加の29日間サバイバル。毎日0時に累積ポイント下位24%が脱落し、最後の1人になるまで続く。"
  );
  return {
    title: t(SQUID.title),
    description: desc,
    alternates: { canonical: localePath(locale, "/squid") },
    openGraph: {
      title: t(SQUID.title),
      description: desc,
      images: ["/og.png"],
    },
  };
}

export default async function SquidPage() {
  const state = await getSquidState();
  return (
    <div className="space-y-5">
      <SquidHub initial={state} siteName={SITE_NAME} />
    </div>
  );
}
