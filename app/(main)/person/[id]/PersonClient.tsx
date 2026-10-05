"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Trophy, Users, Vote } from "lucide-react";
import Avatar from "@/components/Avatar";
import VotePanel, { type VoteInfo } from "@/components/VotePanel";
import EvalPanel from "@/components/EvalPanel";
import ShareButtons from "@/components/ShareButtons";
import CommentSection from "@/components/CommentSection";
import type { EvalStats, Person, PollWithOptions, VoteStats } from "@/lib/types";
import { useT } from "@/lib/i18n-client";

type RankInfo = { rank: number; total: number } | null;

export default function PersonClient({
  person,
  voteStats,
  evalStats,
  initialVoted,
  initialVoteType,
  myEval,
  tagRanking,
  relatedPeople,
  relatedPolls,
  likeRank,
}: {
  person: Person;
  voteStats: VoteStats;
  evalStats: EvalStats;
  initialVoted: boolean;
  initialVoteType: "like" | "dislike" | null;
  myEval: Record<string, number | null> | null;
  tagRanking: { id: string; name: string; likePct: number; total: number }[];
  relatedPeople: Person[];
  relatedPolls: PollWithOptions[];
  likeRank: RankInfo;
}) {
  const t = useT();
  const [voteInfo, setVoteInfo] = useState<VoteInfo>({
    voted: initialVoted,
    voteType: initialVoteType,
    likes: voteStats.likes,
    dislikes: voteStats.dislikes,
  });
  const voted = voteInfo.voted;
  const overall = evalStats.overall;
  // スレ落ち（Xアカウントが確認できない/別人が使用中）→ アーカイブ表示
  const archived = !!person.x_status && person.x_status !== "ok";
  // 概要文: Xの現在のプロフィール文（x_description）を優先、なければサイト側のdescription
  const profileText = person.x_description || person.description;

  return (
    <div className="space-y-6">
      {/* プロフィール */}
      <section className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar name={person.name} avatarUrl={person.avatar_url} size={80} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black">{person.name}</h1>
              {person.handle && !archived && (
                <a
                  href={`https://x.com/${person.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-x hover:underline flex items-center gap-0.5"
                >
                  @{person.handle}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {profileText && (
              <p className="text-mut text-sm mt-2 leading-relaxed whitespace-pre-wrap">
                {profileText}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="text-xs px-2.5 py-1 rounded-full bg-xsoft text-x whitespace-nowrap">{person.category}</span>
              {person.tags.map((t) => (
                <Link
                  key={t}
                  href={`/tag/${encodeURIComponent(t)}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-panel2 border border-line text-mut hover:text-x hover:border-line2 transition whitespace-nowrap"
                >
                  #{t}
                </Link>
              ))}
            </div>
            {archived && (
              <div className="mt-3 bg-panel2 border border-line rounded-lg px-3 py-2 text-xs text-mut leading-relaxed">
                ※{" "}
                {person.x_status === "reused"
                  ? person.handle
                    ? t("@{handle} は現在、別のアカウントが使用されています（ID変更後に解放された可能性）。", { handle: person.handle })
                    : t("このIDは現在、別のアカウントが使用されています。")
                  : t("このXアカウントは現在確認できません（凍結・削除・ID変更など）。")}
                {t("このページはアーカイブされました。")}
                {person.x_checked_at && (
                  <span>
                    {t("（最終確認: {date}）", { date: String(person.x_checked_at).slice(0, 10).replace(/-/g, "/") })}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="text-center shrink-0 w-full sm:w-auto px-5 py-3 rounded-xl bg-panel2 border border-line">
            <div className="text-xs text-mut mb-1">{t("総合評価")}</div>
            <div className="text-3xl font-black text-gold">{overall != null ? overall.toFixed(1) : "—"}</div>
            <div className="text-[11px] text-mut mt-1">{t("回答 {n}人", { n: evalStats.total })}</div>
            {likeRank && (
              <div className="text-[11px] text-mut mt-0.5">
                {t("好き率 {rank}位 / {total}人", { rank: likeRank.rank, total: likeRank.total })}
              </div>
            )}
            <Link
              href={`/compare?a=${person.id}`}
              className="mt-2 inline-block text-xs px-3 py-1 rounded-lg border border-line text-mut hover:text-txt hover:border-line2 transition"
            >
              {t("比較する")}
            </Link>
          </div>
        </div>
      </section>

      {/* 投票 */}
      <VotePanel
        personId={person.id}
        personName={person.name}
        initialLikes={voteStats.likes}
        initialDislikes={voteStats.dislikes}
        initialVoted={initialVoted}
        initialVoteType={initialVoteType}
        onVotedChange={setVoteInfo}
        archived={archived}
      />

      {!archived && voted && (
        <ShareButtons
          personName={person.name}
          voteType={voteInfo.voteType}
          likeCount={voteInfo.likes}
          dislikeCount={voteInfo.dislikes}
        />
      )}

      {/* 8項目評価 */}
      <EvalPanel
        personId={person.id}
        personName={person.name}
        initialStats={evalStats}
        hasVoted={voted}
        initialMine={myEval}
        archived={archived}
      />

      {/* タグ内ランキング */}
      {tagRanking.length > 0 && (
        <section className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-1 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            {t("タグ内好感度ランキング")}
          </h2>
          <p className="text-xs text-mut mb-4">
            {t("「{tags}」タグを持つ人物の中での好き率", { tags: person.tags.slice(0, 2).join("・") })}
          </p>
          <div className="space-y-3">
            {tagRanking.map((t2, i) => (
              <div key={t2.id} className="flex items-center gap-3">
                <span className={`w-6 text-center text-sm font-black ${i === 0 ? "text-gold" : "text-mut/70"}`}>
                  {i + 1}
                </span>
                <Link href={`/person/${t2.id}`} className="flex-1 text-sm truncate hover:text-x transition">
                  {t2.name}
                </Link>
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <div className="flex-1 bg-line rounded-full h-1.5 overflow-hidden flex">
                    <div className="bg-like h-full" style={{ width: `${t2.likePct}%` }} />
                    <div className="bg-dislike h-full" style={{ width: `${100 - t2.likePct}%` }} />
                  </div>
                  <span className="text-xs font-bold text-like w-12 text-right">{t2.likePct.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 関連人物 */}
      {relatedPeople.length > 0 && (
        <section className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-x" />
            {t("関連人物")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedPeople.map((p) => (
              <Link
                key={p.id}
                href={`/person/${p.id}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-panel2 border border-line hover:border-line2 transition text-sm"
              >
                <Avatar name={p.name} avatarUrl={p.avatar_url} size={22} />
                {p.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 関連する投票トーク */}
      {relatedPolls.length > 0 && (
        <section className="bg-panel border border-line rounded-2xl p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Vote className="w-4 h-4 text-good" />
            {t("関連する投票トーク")}
          </h2>
          <div className="space-y-2">
            {relatedPolls.map((poll) => (
              <Link
                key={poll.id}
                href={`/polls/${poll.id}`}
                className="block bg-panel2 border border-line rounded-xl p-3 hover:border-line2 transition"
              >
                <p className="font-bold text-sm truncate">{poll.title}</p>
                {poll.description && <p className="text-xs text-mut truncate mt-0.5">{poll.description}</p>}
                <p className="text-xs text-mut mt-1">{t("{n}票", { n: poll.total_votes })}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* コメント */}
      <CommentSection personId={person.id} personName={person.name} hasVoted={voted} myVoteType={voteInfo.voteType} archived={archived} />
    </div>
  );
}
