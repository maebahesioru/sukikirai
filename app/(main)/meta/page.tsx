import type { Metadata } from "next";
import { getMetaPosts } from "@/lib/queries";
import MetaThread from "@/components/MetaThread";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `管理スレ（要望・バグ報告）｜${SITE_NAME}`,
  description: "ツイッタラー世論調査への機能要望・バグ報告・その他の連絡用スレッドです。",
};

export default async function MetaPage() {
  const posts = await getMetaPosts();
  return (
    <div className="space-y-5">
      <MetaThread initialPosts={posts} />
    </div>
  );
}
