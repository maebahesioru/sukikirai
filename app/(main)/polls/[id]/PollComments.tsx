"use client";

import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Send, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react";
import { timeAgo } from "@/lib/format";

type PollComment = {
  id: string;
  poll_id: string;
  comment_number: number;
  name: string | null;
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  parent_comment_id: string | null;
  replies?: PollComment[];
};

function getCharCount(text: string): number {
  let c = 0;
  for (let i = 0; i < text.length; i++) c += text.charCodeAt(i) <= 0x7f ? 1 : 2;
  return c;
}

export default function PollComments({ pollId }: { pollId: string }) {
  const [comments, setComments] = useState<PollComment[]>([]);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/polls/comments?pollId=${encodeURIComponent(pollId)}`);
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
        setTotal(data.total);
      }
    } catch {
      /* noop */
    }
  }, [pollId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (getCharCount(content) > 280) {
      alert("コメントは全角140文字（半角280文字）以内です");
      return;
    }
    const token = Cookies.get("user_token");
    if (!token) {
      alert("投稿には利用規約への同意が必要です。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          name: name.trim() || null,
          content: content.trim(),
          userToken: token,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "投稿に失敗しました");
        return;
      }
      setContent("");
      setName("");
      fetchComments();
    } catch {
      alert("投稿に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <h2 className="font-bold mb-4">コメント（{total}）</h2>

      <form onSubmit={submit} className="bg-panel2 border border-line rounded-xl p-4 space-y-3 mb-6">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder="名前（任意・未入力で匿名）"
          className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="コメントを入力...（全角140文字まで）"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-line text-sm resize-y focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${getCharCount(content) > 280 ? "text-bad font-bold" : "text-mut"}`}>
            {getCharCount(content)} / 280
          </span>
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition flex items-center gap-1.5 ${
              busy || !content.trim() ? "bg-panel text-mut cursor-not-allowed" : "bg-x hover:opacity-90"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            {busy ? "投稿中..." : "投稿"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {comments.map((c) => (
          <PollCommentItem key={c.id} comment={c} pollId={pollId} onUpdate={fetchComments} />
        ))}
        {comments.length === 0 && (
          <p className="text-center text-mut py-6 text-sm">まだコメントがありません</p>
        )}
      </div>
    </section>
  );
}

function PollCommentItem({
  comment,
  pollId,
  onUpdate,
}: {
  comment: PollComment;
  pollId: string;
  onUpdate: () => void;
}) {
  const [myReaction, setMyReaction] = useState<"good" | "bad" | null>(null);
  const [counts, setCounts] = useState({ good: comment.good_count, bad: comment.bad_count });
  const [showReply, setShowReply] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyText, setReplyText] = useState(`>>${comment.comment_number}\n`);
  const [busy, setBusy] = useState(false);

  const react = async (type: "good" | "bad") => {
    const token = Cookies.get("user_token") ?? "";
    try {
      const res = await fetch("/api/polls/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollCommentId: comment.id, reactionType: type, userToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        setCounts({ good: data.good, bad: data.bad });
        setMyReaction(data.myReaction);
      }
    } catch {
      /* noop */
    }
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    const token = Cookies.get("user_token");
    if (!token) {
      alert("返信には利用規約への同意が必要です");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          name: replyName.trim() || null,
          content: replyText.trim(),
          parentCommentId: comment.id,
          userToken: token,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "返信に失敗しました");
        return;
      }
      setReplyText(`>>${comment.comment_number}\n`);
      setShowReply(false);
      onUpdate();
    } catch {
      alert("返信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-line rounded-xl p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2 text-sm">
        <span className="text-mut text-xs">#{comment.comment_number}</span>
        <span className="font-medium">{comment.name || "匿名"}</span>
        <span className="text-xs text-mut">{timeAgo(comment.created_at)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed mb-3">{comment.content}</p>
      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={() => react("good")}
          className={`flex items-center gap-1 transition ${
            myReaction === "good" ? "text-good font-bold" : "text-mut hover:text-good"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          {counts.good}
        </button>
        <button
          onClick={() => react("bad")}
          className={`flex items-center gap-1 transition ${
            myReaction === "bad" ? "text-bad font-bold" : "text-mut hover:text-bad"
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          {counts.bad}
        </button>
        <button
          onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1 text-mut hover:text-x transition"
        >
          <MessageCircle className="w-4 h-4" />
          返信
        </button>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-line space-y-3">
          {comment.replies.map((r) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-mut text-xs">&gt;&gt;{comment.comment_number}</span>
                <span className="font-medium">{r.name || "匿名"}</span>
                <span className="text-xs text-mut">{timeAgo(r.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {showReply && (
        <form onSubmit={submitReply} className="mt-3 bg-panel2 border border-line rounded-xl p-3 space-y-2">
          <input
            type="text"
            value={replyName}
            onChange={(e) => setReplyName(e.target.value.slice(0, 50))}
            placeholder="名前（任意）"
            className="w-full px-3 py-2 rounded-lg border border-line text-sm"
          />
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-line text-sm resize-y"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-1.5 rounded-lg bg-x text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              返信を投稿
            </button>
            <button
              type="button"
              onClick={() => setShowReply(false)}
              className="px-4 py-1.5 rounded-lg bg-panel border border-line text-sm text-mut hover:text-txt transition"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
