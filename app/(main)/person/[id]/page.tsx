import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  getEvalStats,
  getLikeRankingPosition,
  getMyEvalToday,
  getPeopleByIds,
  getPerson,
  getRanking,
  getRecentComments,
  getRelatedPolls,
  getTagRanking,
  getTodayVote,
  getVoteStats,
} from "@/lib/queries";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { maybeRefreshPersonProfile } from "@/lib/xsync";
import PersonClient from "./PersonClient";
import Sidebar from "@/components/Sidebar";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const p = await getPerson(decodeURIComponent(id));
  if (!p || p.is_hidden) return { title: "人物が見つかりません" };
  const archived = !!p.x_status && p.x_status !== "ok";
  return {
    title: `${p.name}の評価・好き嫌い`,
    description:
      p.x_description ||
      p.description ||
      `${p.name}${p.handle ? ` (@${p.handle})` : ""} への好き嫌い投票・8項目評価・コメント一覧。`,
    alternates: { canonical: `/person/${p.id}` },
    ...(archived ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: `${p.name}の評価・好き嫌い | ${SITE_NAME}`,
      description: p.x_description || p.description || undefined,
    },
  };
}

export default async function PersonPage({ params }: Params) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const person = await getPerson(id);
  if (!person || person.is_hidden) notFound();

  // 閲覧時にプロフィールをバックグラウンド同期（1時間キャッシュ・次の表示から反映）
  void maybeRefreshPersonProfile(person.id).catch(() => {});

  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value ?? "";

  const [voteStats, evalStats, myVote, myEval, tagRanking, relatedPeople, relatedPolls, likeRank, trending, recent] =
    await Promise.all([
      getVoteStats(id),
      getEvalStats(id),
      getTodayVote(id, token),
      getMyEvalToday(id, token),
      getTagRanking(person),
      getPeopleByIds(person.related),
      getRelatedPolls(id),
      getLikeRankingPosition(id),
      getRanking("trending", 8),
      getRecentComments(5),
    ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    description: person.x_description || person.description || undefined,
    url: `${SITE_URL}/person/${person.id}`,
    aggregateRating:
      voteStats.total > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: ((voteStats.likes / voteStats.total) * 5).toFixed(1),
            bestRating: "5",
            worstRating: "0",
            ratingCount: String(voteStats.total),
          }
        : undefined,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PersonClient
          person={{
            ...person,
            x_checked_at: person.x_checked_at
              ? typeof person.x_checked_at === "string"
                ? person.x_checked_at
                : person.x_checked_at.toISOString()
              : null,
          }}
          voteStats={voteStats}
          evalStats={evalStats}
          initialVoted={myVote !== null}
          initialVoteType={myVote}
          myEval={myEval}
          tagRanking={tagRanking}
          relatedPeople={relatedPeople}
          relatedPolls={relatedPolls}
          likeRank={likeRank}
        />
      </div>
      <div className="lg:col-span-1">
        <Sidebar trending={trending} recentComments={recent} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
