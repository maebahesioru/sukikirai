"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { getFingerprint } from "@/lib/fingerprint";

export type VoteInfo = {
  voted: boolean;
  voteType: "like" | "dislike" | null;
  likes: number;
  dislikes: number;
};

export default function VotePanel({
  personId,
  personName,
  initialLikes,
  initialDislikes,
  initialVoted,
  initialVoteType,
  onVotedChange,
  archived = false,
}: {
  personId: string;
  personName: string;
  initialLikes: number;
  initialDislikes: number;
  initialVoted: boolean;
  initialVoteType: "like" | "dislike" | null;
  onVotedChange?: (info: VoteInfo) => void;
  archived?: boolean;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [voted, setVoted] = useState(initialVoted);
  const [voteType, setVoteType] = useState<"like" | "dislike" | null>(initialVoteType);
  const [busy, setBusy] = useState(false);
  const [tweet, setTweet] = useState(true);

  const total = likes + dislikes;
  const likePct = total > 0 ? (likes / total) * 100 : 50;

  const vote = async (t: "like" | "dislike") => {
    if (voted || busy) return;
    const token = Cookies.get("user_token");
    if (!token) {
      alert("投票には利用規約への同意が必要です。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, voteType: t, userToken: token, fp: await getFingerprint() }),
      });
      const data = await res.json();
      if (data.success) {
        setLikes(data.likes);
        setDislikes(data.dislikes);
        setVoted(true);
        setVoteType(t);
        onVotedChange?.({ voted: true, voteType: t, likes: data.likes, dislikes: data.dislikes });
        if (tweet) {
          const totalN = data.likes + data.dislikes;
          const lp = totalN > 0 ? Math.round((data.likes / totalN) * 100) : 0;
          const text = `【${t === "like" ? "好き派" : "嫌い派"}】${personName}に投票しました！\n【好き派】${lp}% vs【嫌い派】${100 - lp}%\n#ツイッタラー世論調査`;
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`,
            "_blank"
          );
        }
      } else if (res.status === 429 && data.voteType) {
        setLikes(data.likes ?? likes);
        setDislikes(data.dislikes ?? dislikes);
        setVoted(true);
        setVoteType(data.voteType);
        onVotedChange?.({
          voted: true,
          voteType: data.voteType,
          likes: data.likes ?? likes,
          dislikes: data.dislikes ?? dislikes,
        });
        alert("今日は既に投票済みです。\n\n投票は1日1回可能です。明日また投票してください。");
      } else {
        alert(data.error || "投票に失敗しました。もう一度お試しください。");
      }
    } catch {
      alert("投票に失敗しました。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  };

  // スレ落ち（アーカイブ）: 結果のみ表示・投票不可
  if (archived) {
    return (
      <section className="bg-panel border border-line rounded-2xl p-6">
        <h2 className="text-xl font-bold text-center mb-5">{personName}のことは…好き？嫌い？</h2>
        <div className="flex justify-between mb-2 text-sm font-bold">
          <span className="text-like">
            好き {likes}票（{likePct.toFixed(1)}%）
          </span>
          <span className="text-dislike">
            嫌い {dislikes}票（{(100 - likePct).toFixed(1)}%）
          </span>
        </div>
        <div className="w-full bg-line rounded-full h-4 overflow-hidden flex border border-line">
          <div className="bg-gradient-to-r from-like to-pink-500 h-full" style={{ width: `${likePct}%` }} />
          <div className="bg-gradient-to-r from-indigo-500 to-dislike h-full" style={{ width: `${100 - likePct}%` }} />
        </div>
        <p className="text-center text-xs text-mut mt-4">
          ※ このページはアーカイブされたため、投票は終了しています
        </p>
      </section>
    );
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <h2 className="text-xl font-bold text-center mb-5">{personName}のことは…好き？嫌い？</h2>

      {!voted ? (
        <>
          <p className="text-center text-mut text-sm mb-5">
            投票すると、みんなのコメントが読めるようになり、8項目評価を書き込めます
          </p>
          <div className="flex gap-3 justify-center max-w-md mx-auto">
            <button
              onClick={() => vote("like")}
              disabled={busy}
              className="flex-1 py-3.5 rounded-xl font-bold text-lg text-white bg-gradient-to-br from-like to-pink-600 hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ThumbsUp className="w-5 h-5" />
              {busy ? "処理中..." : "好き"}
            </button>
            <button
              onClick={() => vote("dislike")}
              disabled={busy}
              className="flex-1 py-3.5 rounded-xl font-bold text-lg text-white bg-gradient-to-br from-dislike to-indigo-600 hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ThumbsDown className="w-5 h-5" />
              嫌い
            </button>
          </div>
          <label className="flex items-center justify-center gap-2 text-sm text-mut cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={tweet}
              onChange={(e) => setTweet(e.target.checked)}
              className="w-4 h-4 accent-sky-500"
            />
            Xでツイートする
          </label>
        </>
      ) : (
        <div>
          <div className="flex justify-between mb-2 text-sm font-bold">
            <span className="text-like">
              好き {likes}票（{likePct.toFixed(1)}%）
            </span>
            <span className="text-dislike">
              嫌い {dislikes}票（{(100 - likePct).toFixed(1)}%）
            </span>
          </div>
          <div className="w-full bg-panel2 rounded-full h-4 overflow-hidden flex border border-line">
            <div className="bg-gradient-to-r from-like to-pink-500 h-full bar-anim" style={{ width: `${likePct}%` }} />
            <div className="bg-gradient-to-r from-indigo-500 to-dislike h-full bar-anim" style={{ width: `${100 - likePct}%` }} />
          </div>
          <p className="text-center text-sm mt-4">
            あなたは「
            <span className={voteType === "like" ? "text-like font-bold" : "text-dislike font-bold"}>
              {voteType === "like" ? "好き" : "嫌い"}
            </span>
            」に投票しました
          </p>
          <p className="text-center text-xs text-mut mt-1">※投票は1日1回まで</p>
        </div>
      )}
    </section>
  );
}
