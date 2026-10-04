import Link from "next/link";
import type { Metadata } from "next";
import { PlusCircle, Vote } from "lucide-react";
import { getPeopleByIds, listPolls } from "@/lib/queries";
import type { PollPersonLite } from "@/lib/pollui";
import PollCard from "@/components/PollCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "投票トーク",
  description: "みんなで作るアンケート「投票トーク」。誰でも作成・投票・コメントできます。",
  alternates: { canonical: "/polls" },
};

export default async function PollsPage() {
  const polls = await listPolls(100);

  // 関連人物のアイコンを選択肢に自動表示するため、一覧分をまとめて取得
  const relIds = [...new Set(polls.flatMap((p) => p.related_person_ids ?? []))];
  const relPeople = await getPeopleByIds(relIds);
  const relById = new Map<string, PollPersonLite>(
    relPeople.map((p) => [p.id, { id: p.id, name: p.name, avatar_url: p.avatar_url }])
  );

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Vote className="w-6 h-6 text-good" />
            <h1 className="text-2xl font-black">投票トーク</h1>
          </div>
          <Link
            href="/polls/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
          >
            <PlusCircle className="w-4 h-4" />
            投票を作成する
          </Link>
        </div>
        <p className="text-sm text-mut mt-3 leading-relaxed">
          テーマは自由。2択・3択以上のアンケートを誰でも作成できて、みんなで投票＆コメントできます。
          関連する人物を1人以上選んで作成します（アイコンや関連表示に使われます）。
        </p>
      </section>

      {polls.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-10 text-center text-mut">
          まだ投票トークがありません。最初の1つを作ってみよう！
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              related={(poll.related_person_ids ?? [])
                .map((id) => relById.get(id))
                .filter((x): x is PollPersonLite => !!x)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
