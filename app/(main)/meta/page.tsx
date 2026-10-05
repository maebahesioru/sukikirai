import type { Metadata } from "next";
import { localePath } from "@/lib/i18n-core";
import { getLocale } from "@/lib/i18n-server";
import { getMetaPosts } from "@/lib/queries";
import MetaThread from "@/components/MetaThread";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
  title: "管理スレ（要望・バグ報告）",
  description: "ツイッタラー世論調査への機能要望・バグ報告・その他の連絡用スレッドです。",
  alternates: { canonical: localePath(locale, "/meta") },
  };
}

export default async function MetaPage() {
  const posts = await getMetaPosts();
  return (
    <div className="space-y-5">
      <MetaThread initialPosts={posts} />
    </div>
  );
}
