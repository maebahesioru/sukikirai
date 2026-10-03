"use client";

import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
  Flag,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Send,
} from "lucide-react";
import type { CommentRow, CommentWithReplies } from "@/lib/types";
import { REPORT_REASONS, type ReportReason, MAX_COMMENT_CHARS } from "@/lib/constants";
import ReportModal from "./ReportModal";
import CommentText from "./CommentText";
import { timeAgo, fmtTime2ch } from "@/lib/format";
import Avatar from "./Avatar";

type FilterType = "all" | "like" | "dislike";
type SortType = "newest" | "popular";

function getCharCount(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    count += text.charCodeAt(i) <= 0x7f ? 1 : 2;
  }
  return count;
}

const isSageMail = (m?: string | null) => (m ?? "").trim().toLowerCase() === "sage";

export default function CommentSection({
  personId,
  hasVoted,
  archived = false,
}: {
  personId: string;
  hasVoted: boolean;
  archived?: boolean;
}) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?personId=${encodeURIComponent(personId)}&filter=${filter}&sort=${sort}&page=${page}`
      );
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
        setTotal(data.total);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [personId, filter, sort, page]);

  useEffect(() => {
    if (hasVoted || archived) fetchComments();
  }, [hasVoted, archived, fetchComments]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const list = (
    <>
      <div className={`space-y-4 ${archived ? "" : "mt-6"} ${loading ? "opacity-60" : ""}`}>
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} onUpdate={fetchComments} locked={archived} />
        ))}
        {comments.length === 0 && !loading && (
          <p className="text-center text-mut py-8 text-sm">
            {archived ? "コメントはありません" : "まだコメントがありません。最初のコメントを書いてみよう！"}
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-panel2 border border-line disabled:opacity-40 hover:border-line2 transition text-sm"
          >
            前へ
          </button>
          <span className="text-sm text-mut">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-panel2 border border-line disabled:opacity-40 hover:border-line2 transition text-sm"
          >
            次へ
          </button>
        </div>
      )}
    </>
  );

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xl font-bold">コメント（{total}）</h2>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "すべて"],
              ["like", "好き派"],
              ["dislike", "嫌い派"],
            ] as [FilterType, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                filter === f
                  ? f === "like"
                    ? "bg-like text-white border-like"
                    : f === "dislike"
                    ? "bg-dislike text-white border-dislike"
                    : "bg-x text-white border-x"
                  : "bg-panel2 text-mut border-line hover:text-txt"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-mut text-sm ml-1">並び:</span>
          <button
            onClick={() => {
              setSort("newest");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              sort === "newest" ? "bg-x text-white border-x" : "bg-panel2 text-mut border-line"
            }`}
          >
            新着順
          </button>
          <button
            onClick={() => {
              setSort("popular");
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              sort === "popular" ? "bg-x text-white border-x" : "bg-panel2 text-mut border-line"
            }`}
          >
            人気順
          </button>
        </div>
      </div>

      {archived ? (
        <>
          <div className="bg-panel2 border border-line rounded-xl p-3 mb-4 text-center text-xs text-mut">
            このページはアーカイブされたため、コメントの新規投稿はできません
          </div>
          {list}
        </>
      ) : !hasVoted ? (
        <div className="bg-panel2 border border-line rounded-xl p-6 text-center text-mut">
          コメントを見るには、まず上の「好き / 嫌い」に投票してください
        </div>
      ) : (
        <>
          <CommentForm personId={personId} onPosted={fetchComments} />
          {list}
        </>
      )}
    </section>
  );
}

// ---------------- 投稿フォーム ----------------

function CommentForm({
  personId,
  parentCommentId,
  parentNumber,
  onPosted,
}: {
  personId: string;
  parentCommentId?: string;
  parentNumber?: number;
  onPosted: () => void;
}) {
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [voteType, setVoteType] = useState<"like" | "dislike">("like");
  const [content, setContent] = useState(parentNumber ? `>>${parentNumber}\n` : "");
  const [tweet, setTweet] = useState(true);
  const [busy, setBusy] = useState(false);

  const count = getCharCount(content);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert("コメントを入力してください");
      return;
    }
    if (count > MAX_COMMENT_CHARS) {
      alert(`コメントは全角${Math.floor(MAX_COMMENT_CHARS / 2)}文字（半角${MAX_COMMENT_CHARS}文字）以内です`);
      return;
    }
    const token = Cookies.get("user_token");
    if (!token) {
      alert("投稿には利用規約への同意が必要です。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId,
          name: name.trim() || null,
          mail: mail.trim() || null,
          voteType,
          content: content.trim(),
          parentCommentId: parentCommentId ?? null,
          userToken: token,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "投稿に失敗しました");
        return;
      }
      if (tweet && !parentCommentId) {
        const text = `【${voteType === "like" ? "好き派" : "嫌い派"}】としてコメントを投稿しました！\n\n「${content.trim()}」\n\n#ツイッタラー世論調査`;
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`,
          "_blank"
        );
      }
      setName("");
      setContent(parentNumber ? `>>${parentNumber}\n` : "");
      if (!parentCommentId) alert("コメントを投稿しました");
      onPosted();
    } catch {
      alert("投稿に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-panel2 border border-line rounded-xl p-4 space-y-3">
      {parentNumber && (
        <p className="text-sm font-bold text-mut">&gt;&gt;{parentNumber} への返信</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 64))}
          placeholder="名前（任意・#でトリップ）"
          title="「名前#パスワード」で ◆から始まるトリップ（2ch互換の個人証明）が付きます"
          className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <input
          type="text"
          value={mail}
          onChange={(e) => setMail(e.target.value.slice(0, 64))}
          placeholder="メール（sageでageない）"
          title="sage と入力すると2ch互換板のスレ一覧でこのスレが上がらなくなります"
          className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setVoteType("like")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
            voteType === "like"
              ? "bg-gradient-to-r from-like to-pink-600 text-white"
              : "bg-panel text-mut border border-line hover:text-txt"
          }`}
        >
          好き派として投稿
        </button>
        <button
          type="button"
          onClick={() => setVoteType("dislike")}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
            voteType === "dislike"
              ? "bg-gradient-to-r from-dislike to-indigo-600 text-white"
              : "bg-panel text-mut border border-line hover:text-txt"
          }`}
        >
          嫌い派として投稿
        </button>
      </div>

      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={parentNumber ? `>>${parentNumber}\n返信内容を入力...` : "コメントを入力...（全角140文字まで）"}
          rows={parentNumber ? 3 : 4}
          className="w-full px-3 py-2 rounded-lg border border-line text-sm resize-y focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <div className="flex justify-between items-center mt-1">
          <p className="text-xs text-mut">URLの投稿はできません</p>
          <span className={`text-xs ${count > MAX_COMMENT_CHARS ? "text-bad font-bold" : "text-mut"}`}>
            {count} / {MAX_COMMENT_CHARS}
          </span>
        </div>
      </div>

      {!parentCommentId && (
        <label className="flex items-center gap-2 text-sm text-mut cursor-pointer">
          <input
            type="checkbox"
            checked={tweet}
            onChange={(e) => setTweet(e.target.checked)}
            className="w-4 h-4 accent-sky-500"
          />
          Xでツイートする
        </label>
      )}

      <button
        type="submit"
        disabled={busy}
        className={`w-full py-2.5 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 ${
          busy ? "bg-panel text-mut cursor-not-allowed" : "bg-gradient-to-r from-like to-dislike hover:opacity-90"
        }`}
      >
        <Send className="w-4 h-4" />
        {busy ? "投稿中..." : parentCommentId ? "返信を投稿" : "コメントを投稿"}
      </button>
    </form>
  );
}

// ---------------- コメント表示 ----------------

function CommentItem({
  comment,
  onUpdate,
  locked = false,
}: {
  comment: CommentWithReplies;
  onUpdate: () => void;
  locked?: boolean;
}) {
  const [local, setLocal] = useState<CommentRow>(comment);
  const [replies, setReplies] = useState<CommentRow[]>(comment.replies);
  const [myReaction, setMyReaction] = useState<"good" | "bad" | null>(null);
  const [showReply, setShowReply] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  useEffect(() => {
    setLocal(comment);
    setReplies(comment.replies);
    try {
      const voted = JSON.parse(localStorage.getItem("votedComments") ?? "{}");
      setMyReaction(voted[comment.id] ?? null);
    } catch {
      setMyReaction(null);
    }
  }, [comment]);

  const react = async (type: "good" | "bad") => {
    const token = Cookies.get("user_token") ?? "";
    try {
      const res = await fetch("/api/comments/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: comment.id, reactionType: type, userToken: token }),
      });
      const data = await res.json();
      if (!data.success) return;
      setLocal({ ...local, good_count: data.good, bad_count: data.bad });
      setMyReaction(data.myReaction);
      const voted = JSON.parse(localStorage.getItem("votedComments") ?? "{}");
      if (data.myReaction) voted[comment.id] = data.myReaction;
      else delete voted[comment.id];
      localStorage.setItem("votedComments", JSON.stringify(voted));
    } catch {
      /* noop */
    }
  };

  const hide = () => {
    const hidden = JSON.parse(localStorage.getItem("hiddenComments") ?? "[]");
    if (!hidden.includes(comment.id)) hidden.push(comment.id);
    localStorage.setItem("hiddenComments", JSON.stringify(hidden));
    onUpdate();
    alert("コメントを非表示にしました");
  };

  const report = async (reason: ReportReason, details: string) => {
    setReportBusy(true);
    try {
      const token = Cookies.get("user_token") ?? "";
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: comment.id, reason, details, userToken: token }),
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

  return (
    <div id={`c${comment.comment_number}`} className="border border-line rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <span className="text-mut text-xs">#{comment.comment_number}</span>
          <span className="font-medium">{comment.name || "匿名"}</span>
          {(comment.gender || comment.age_group) && (
            <span className="text-xs text-mut">
              （{[comment.gender, comment.age_group].filter(Boolean).join("・")}）
            </span>
          )}
          {isSageMail(comment.mail) && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut"
              title="sage（2ch互換板のスレ一覧で上がらない投稿）"
            >
              sage
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              comment.vote_type === "like" ? "bg-likesoft text-like" : "bg-dislikesoft text-dislike"
            }`}
          >
            {comment.vote_type === "like" ? "好き派" : "嫌い派"}
          </span>
          <span className="text-xs text-mut" title={timeAgo(comment.created_at)}>
            {fmtTime2ch(comment.created_at)}
          </span>
          <span className="text-[11px] text-mut font-mono">ID:{comment.anon_id}</span>
        </div>
        {!locked && (
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowReport(true)} className="text-mut hover:text-bad transition" title="通報">
              <Flag className="w-4 h-4" />
            </button>
            <button onClick={hide} className="text-mut hover:text-txt transition" title="非表示">
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <CommentText content={comment.content} className="whitespace-pre-wrap text-sm leading-relaxed mb-3" />

      <div className="flex items-center gap-4 text-sm">
        <button
          onClick={() => react("good")}
          className={`flex items-center gap-1 transition ${
            myReaction === "good" ? "text-good font-bold" : "text-mut hover:text-good"
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
          {local.good_count}
        </button>
        <button
          onClick={() => react("bad")}
          className={`flex items-center gap-1 transition ${
            myReaction === "bad" ? "text-bad font-bold" : "text-mut hover:text-bad"
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          {local.bad_count}
        </button>
        {!locked && (
          <button
            onClick={() => setShowReply(!showReply)}
            className="flex items-center gap-1 text-mut hover:text-x transition"
          >
            <MessageCircle className="w-4 h-4" />
            返信
          </button>
        )}
      </div>

      {replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-line space-y-3">
          {replies.map((r) => (
            <ReplyItem key={r.id} reply={r} parentNumber={comment.comment_number} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      {!locked && showReply && (
        <div className="mt-3">
          <CommentForm
            personId={comment.person_id}
            parentCommentId={comment.id}
            parentNumber={comment.comment_number}
            onPosted={() => {
              setShowReply(false);
              onUpdate();
            }}
          />
        </div>
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

function ReplyItem({
  reply,
  parentNumber,
  onUpdate,
}: {
  reply: CommentRow;
  parentNumber: number;
  onUpdate: () => void;
}) {
  const [local, setLocal] = useState(reply);
  const [myReaction, setMyReaction] = useState<"good" | "bad" | null>(null);

  useEffect(() => {
    setLocal(reply);
    try {
      const voted = JSON.parse(localStorage.getItem("votedComments") ?? "{}");
      setMyReaction(voted[reply.id] ?? null);
    } catch {
      setMyReaction(null);
    }
  }, [reply]);

  const react = async (type: "good" | "bad") => {
    const token = Cookies.get("user_token") ?? "";
    try {
      const res = await fetch("/api/comments/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId: reply.id, reactionType: type, userToken: token }),
      });
      const data = await res.json();
      if (!data.success) return;
      setLocal({ ...local, good_count: data.good, bad_count: data.bad });
      setMyReaction(data.myReaction);
      const voted = JSON.parse(localStorage.getItem("votedComments") ?? "{}");
      if (data.myReaction) voted[reply.id] = data.myReaction;
      else delete voted[reply.id];
      localStorage.setItem("votedComments", JSON.stringify(voted));
    } catch {
      /* noop */
    }
  };

  return (
    <div id={`c${reply.comment_number}`} className="border border-line rounded-lg p-3 bg-panel2/40 text-sm">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className="text-mut text-xs">&gt;&gt;{parentNumber}</span>
        <span className="font-medium">{reply.name || "匿名"}</span>
        {(reply.gender || reply.age_group) && (
          <span className="text-xs text-mut">
            （{[reply.gender, reply.age_group].filter(Boolean).join("・")}）
          </span>
        )}
        {isSageMail(reply.mail) && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut"
            title="sage（2ch互換板のスレ一覧で上がらない投稿）"
          >
            sage
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            reply.vote_type === "like" ? "bg-likesoft text-like" : "bg-dislikesoft text-dislike"
          }`}
        >
          {reply.vote_type === "like" ? "好き派" : "嫌い派"}
        </span>
        <span className="text-xs text-mut" title={timeAgo(reply.created_at)}>
          {fmtTime2ch(reply.created_at)}
        </span>
        <span className="text-[11px] text-mut font-mono">ID:{reply.anon_id}</span>
        <span className="ml-auto" />
      </div>
      <CommentText content={reply.content} className="whitespace-pre-wrap mb-2" />
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={() => react("good")}
          className={`flex items-center gap-1 transition ${
            myReaction === "good" ? "text-good font-bold" : "text-mut hover:text-good"
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          {local.good_count}
        </button>
        <button
          onClick={() => react("bad")}
          className={`flex items-center gap-1 transition ${
            myReaction === "bad" ? "text-bad font-bold" : "text-mut hover:text-bad"
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          {local.bad_count}
        </button>
      </div>
    </div>
  );
}
