"use client";

import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Send, ThumbsUp, ThumbsDown, MessageCircle, Flag, EyeOff } from "lucide-react";
import { timeAgo } from "@/lib/format";
import ReportModal from "@/components/ReportModal";
import type { ReportReason } from "@/lib/constants";

type PollComment = {
  id: string;
  poll_id: string;
  comment_number: number;
  name: string | null;
  mail?: string | null;
  content: string;
  created_at: string;
  good_count: number;
  bad_count: number;
  parent_comment_id: string | null;
  voted_option?: string | null;
  replies?: PollComment[];
};

type SortType = "number" | "new";

const HIDDEN_KEY = "hiddenPollComments";

const isSageMail = (m?: string | null) => (m ?? "").trim().toLowerCase() === "sage";

function getCharCount(text: string): number {
  let c = 0;
  for (let i = 0; i < text.length; i++) c += text.charCodeAt(i) <= 0x7f ? 1 : 2;
  return c;
}

export default function PollComments({ pollId }: { pollId: string }) {
  const [comments, setComments] = useState<PollComment[]>([]);
  const [total, setTotal] = useState(0);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [sort, setSort] = useState<SortType>("number");
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setHiddenIds(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]"));
    } catch {
      /* noop */
    }
  }, []);

  const hide = useCallback((id: string) => {
    setHiddenIds((prev) => {
      const next = Array.from(new Set([...prev, id]));
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/polls/comments?pollId=${encodeURIComponent(pollId)}&sort=${sort}`
      );
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
        setTotal(data.total);
      }
    } catch {
      /* noop */
    }
  }, [pollId, sort]);

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
          mail: mail.trim() || null,
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

  const visible = comments.filter((c) => !hiddenIds.includes(c.id));

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <h2 className="font-bold">コメント（{total}）</h2>
        <div className="ml-auto flex items-center gap-1.5 text-xs">
          {(
            [
              ["number", "No順"],
              ["new", "新着順"],
            ] as [SortType, string][]
          ).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-full border transition ${
                sort === s ? "bg-x text-white border-x" : "bg-panel2 text-mut border-line hover:text-txt"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="bg-panel2 border border-line rounded-xl p-4 space-y-3 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 50))}
            placeholder="名前（任意・未入力で匿名）"
            className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
          <input
            type="text"
            value={mail}
            onChange={(e) => setMail(e.target.value.slice(0, 64))}
            placeholder="メール（sageでageない）"
            title="sage と入力すると2ch互換板のスレ一覧でこのスレが上がらなくなります"
            className="w-full px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
        </div>
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
        {visible.map((c) => (
          <PollCommentItem
            key={c.id}
            comment={c}
            pollId={pollId}
            onUpdate={fetchComments}
            hiddenIds={hiddenIds}
            onHide={hide}
          />
        ))}
        {visible.length === 0 && (
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
  hiddenIds,
  onHide,
}: {
  comment: PollComment;
  pollId: string;
  onUpdate: () => void;
  hiddenIds: string[];
  onHide: (id: string) => void;
}) {
  const [myReaction, setMyReaction] = useState<"good" | "bad" | null>(null);
  const [counts, setCounts] = useState({ good: comment.good_count, bad: comment.bad_count });
  const [showReply, setShowReply] = useState(false);
  const [replyName, setReplyName] = useState("");
  const [replyMail, setReplyMail] = useState("");
  const [replyText, setReplyText] = useState(`>>${comment.comment_number}\n`);
  const [busy, setBusy] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

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

  const report = async (reason: ReportReason, details: string) => {
    setReportBusy(true);
    try {
      const token = Cookies.get("user_token") ?? "";
      const res = await fetch("/api/polls/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollCommentId: comment.id, reason, details, userToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        alert("通報を受け付けました。\n\nご協力ありがとうございます。");
        setShowReport(false);
      } else {
        alert(data.error || "通報に失敗しました");
      }
    } catch {
      alert("通報に失敗しました");
    } finally {
      setReportBusy(false);
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
          mail: replyMail.trim() || null,
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

  const visibleReplies = (comment.replies ?? []).filter((r) => !hiddenIds.includes(r.id));

  return (
    <div className="border border-line rounded-xl p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2 text-sm">
        <span className="text-mut text-xs">#{comment.comment_number}</span>
        <span className="font-medium">{comment.name || "匿名"}</span>
        {isSageMail(comment.mail) && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut"
            title="sage（2ch互換板のスレ一覧で上がらない投稿）"
          >
            sage
          </span>
        )}
        <span className="text-xs text-mut">{timeAgo(comment.created_at)}</span>
        <span className="ml-auto flex gap-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-mut hover:text-bad transition"
            title="通報"
          >
            <Flag className="w-4 h-4" />
          </button>
          <button
            onClick={() => onHide(comment.id)}
            className="text-mut hover:text-txt transition"
            title="非表示"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </span>
      </div>
      {comment.voted_option && (
        <p className="text-sm font-bold text-x mb-1.5">「{comment.voted_option}」に投票しました！</p>
      )}
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

      {visibleReplies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-line space-y-3">
          {visibleReplies.map((r) => (
            <div key={r.id} className="text-sm">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-mut text-xs">&gt;&gt;{comment.comment_number}</span>
                <span className="font-medium">{r.name || "匿名"}</span>
                {isSageMail(r.mail) && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut"
                    title="sage（2ch互換板のスレ一覧で上がらない投稿）"
                  >
                    sage
                  </span>
                )}
                <span className="text-xs text-mut">{timeAgo(r.created_at)}</span>
                <button
                  onClick={() => onHide(r.id)}
                  className="ml-auto text-mut hover:text-txt transition"
                  title="非表示"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                </button>
              </div>
              {r.voted_option && (
                <p className="text-xs font-bold text-x mb-1">「{r.voted_option}」に投票しました！</p>
              )}
              <p className="whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      )}

      {showReply && (
        <form onSubmit={submitReply} className="mt-3 bg-panel2 border border-line rounded-xl p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={replyName}
              onChange={(e) => setReplyName(e.target.value.slice(0, 50))}
              placeholder="名前（任意）"
              className="w-full px-3 py-2 rounded-lg border border-line text-sm"
            />
            <input
              type="text"
              value={replyMail}
              onChange={(e) => setReplyMail(e.target.value.slice(0, 64))}
              placeholder="メール（sageでageない）"
              className="w-full px-3 py-2 rounded-lg border border-line text-sm"
            />
          </div>
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

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={report}
        isSubmitting={reportBusy}
      />
    </div>
  );
}
