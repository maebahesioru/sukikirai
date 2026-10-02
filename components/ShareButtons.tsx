"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";

export default function ShareButtons({
  personName,
  voteType,
  likeCount,
  dislikeCount,
}: {
  personName: string;
  voteType: "like" | "dislike" | null;
  likeCount: number;
  dislikeCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const total = likeCount + dislikeCount;
  const likePct = total > 0 ? Math.round((likeCount / total) * 100) : 0;
  const dislikePct = 100 - likePct;
  const url = () => (typeof window !== "undefined" ? window.location.href : "");

  const text = `【${voteType === "like" ? "好き派" : "嫌い派"}】${personName} のこと好き？嫌い？\n【好き派】${likePct}% vs【嫌い派】${dislikePct}%\n#ツイッタラー世論調査`;

  const open = (u: string) => window.open(u, "_blank");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("コピーに失敗しました");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() =>
          open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`
          )
        }
        className="flex-1 min-w-32 py-2.5 rounded-xl bg-panel border border-line hover:border-line2 font-bold text-sm transition flex items-center justify-center gap-2"
      >
        <Share2 className="w-4 h-4" />Xでシェア
      </button>
      <button
        onClick={() =>
          open(`https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url()}`)}`)
        }
        className="flex-1 min-w-32 py-2.5 rounded-xl bg-panel border border-line hover:border-line2 font-bold text-sm transition"
      >
        Bluesky
      </button>
      <button
        onClick={() =>
          open(`https://line.me/R/msg/text/?${encodeURIComponent(`${text} ${url()}`)}`)
        }
        className="flex-1 min-w-32 py-2.5 rounded-xl bg-panel border border-line hover:border-line2 font-bold text-sm transition"
      >
        LINE
      </button>
      <button
        onClick={copy}
        className="flex-1 min-w-32 py-2.5 rounded-xl bg-panel border border-line hover:border-line2 font-bold text-sm transition flex items-center justify-center gap-2"
      >
        {copied ? <Check className="w-4 h-4 text-good" /> : <Link2 className="w-4 h-4" />}
        {copied ? "コピー完了" : "リンクをコピー"}
      </button>
    </div>
  );
}
