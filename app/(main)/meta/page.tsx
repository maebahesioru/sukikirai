import type { Metadata } from "next";
import { getMetaPosts } from "@/lib/queries";
import MetaThread from "@/components/MetaThread";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "管理スレ（要望・バグ報告）",
  description: "ツイッタラー世論調査への機能要望・バグ報告・その他の連絡用スレッドです。",
  alternates: { canonical: "/meta" },
};

export default async function MetaPage() {
  const posts = await getMetaPosts();
  return (
    <div className="space-y-5">
      <MetaThread initialPosts={posts} />
    </div>
  );
}
