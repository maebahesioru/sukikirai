"use client";

import { useEffect, useState } from "react";
import { getUserToken } from "@/lib/client-token";
import { MessageSquare, MessageCircle, ThumbsUp, ThumbsDown, Trash2, Send } from "lucide-react";
import { fmtTime2ch } from "@/lib/format";
import EmojiText from "./EmojiText";
import LinkEmbeds from "./LinkEmbeds";
import { MAX_COMMENT_CHARS } from "@/lib/constants";
import { charCount } from "@/lib/validate";
import { useT } from "@/lib/i18n-client";
import TranslateBox from "@/components/TranslateBox";

type MetaPost = {
  id: string;
  post_number: number;
  name: string | null;
  content: string;
  created_at: string;
  anon_id: string;
  mail: string | null;
  good_count: number;
  bad_count: number;
  parent_post_id: string | null;
};
type MetaPostWithReplies = MetaPost & { replies: MetaPost[] };

const isSageMail = (m?: string | null) => (m ?? "").trim().toLowerCase() === "sage";

/** 管理スレ（2026-10-12 掲示板化: 番号・>>アンカー・返信・good/bad） */
export default function MetaThread({ initialPosts }: { initialPosts: MetaPostWithReplies[] }) {
  const t = useT();
  const [posts, setPosts] = useState<MetaPostWithReplies[]>(initialPosts);
  const [busy, setBusy] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ id: string; key: string } | null>(null);
  const [delId, setDelId] = useState("");
  const [delKey, setDelKey] = useState("");

  const refresh = async () => {
    try {
      const r = await fetch("/api/meta");
      const d = await r.json();
      if (d.success) setPosts(d.posts);
    } catch {
      /* noop */
    }
  };

  const del = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delId.trim() || !delKey.trim()) {
      alert(t("投稿IDと削除キーを入力してください"));
      return;
    }
    if (!confirm(t("この投稿を削除しますか？"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/meta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: delId.trim(), deleteKey: delKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        await refresh();
        setDelId("");
        setDelKey("");
        alert(t("投稿を削除しました"));
      } else {
        alert(data.error || t("削除できませんでした"));
      }
    } catch {
      alert(t("削除できませんでした"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="w-6 h-6 text-good" />
        <h1 className="text-2xl font-black">{t("管理スレ")}</h1>
      </div>
      <p className="text-sm text-mut leading-relaxed mb-5">
        {t("機能要望・バグ報告・その他、運営への連絡はここにどうぞ。2ch専ブラ（Siki等）からも書き込めます。")}
      </p>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <p className="text-sm text-mut text-center py-8">
            {t("まだ書き込みがありません。最初の1件をどうぞ。")}
          </p>
        ) : (
          posts.map((p) => <PostItem key={p.id} post={p} onUpdate={refresh} />)
        )}
      </div>

      <MetaForm onPosted={refresh} onKey={setIssuedKey} />

      {issuedKey && (
        <div className="mt-4 bg-good/10 border border-good/40 rounded-xl p-4 text-sm">
          <div className="font-bold mb-1">{t("投稿しました。削除キーはこちら:")}</div>
          <div className="font-mono text-lg tracking-wider select-all">{issuedKey.key}</div>
          <div className="text-xs text-mut mt-1">{t("このキーで後から投稿を削除できます。メモ推奨。")}</div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard
                  .writeText(issuedKey.key)
                  .then(() => alert(t("コピーしました")))
                  .catch(() => {});
              }}
              className="px-3 py-1 rounded-lg bg-panel2 border border-line text-xs hover:border-line2 transition"
            >
              {t("コピー")}
            </button>
            <button
              type="button"
              onClick={() => setIssuedKey(null)}
              className="px-3 py-1 rounded-lg bg-panel2 border border-line text-xs hover:border-line2 transition"
            >
              {t("閉じる")}
            </button>
          </div>
        </div>
      )}

      <details className="mt-4">
        <summary className="text-xs text-mut cursor-pointer hover:text-txt">
          {t("投稿を削除（削除キー方式）")}
        </summary>
        <form onSubmit={del} className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="text"
            value={delId}
            onChange={(e) => setDelId(e.target.value)}
            placeholder={t("投稿ID")}
            className="px-3 py-2 rounded-lg border border-line text-sm font-mono focus:outline-none focus:ring-2 focus:ring-x/60"
          />
          <input
            type="text"
            value={delKey}
            onChange={(e) => setDelKey(e.target.value)}
            placeholder={t("削除キー")}
            className="px-3 py-2 rounded-lg border border-line text-sm font-mono focus:outline-none focus:ring-2 focus:ring-x/60"
          />
          <button
            type="submit"
            disabled={busy || !delId.trim() || !delKey.trim()}
            className="px-4 py-2 rounded-lg bg-panel2 border border-line text-sm font-bold hover:border-line2 transition disabled:opacity-50"
          >
            {t("削除する")}
          </button>
        </form>
        <p className="text-[11px] text-mut mt-2">
          {t("投稿IDは各投稿の「IDをコピー」から。投稿時に発行される削除キーとセットで本人削除できます。")}
        </p>
      </details>
    </section>
  );
}

// ---------------- 投稿フォーム（トップレベル / 返信 兼用） ----------------

function MetaForm({
  parentPostId,
  parentNumber,
  onPosted,
  onKey,
}: {
  parentPostId?: string;
  parentNumber?: number;
  onPosted: () => void;
  onKey?: (k: { id: string; key: string }) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [content, setContent] = useState(parentNumber ? `>>${parentNumber}\n` : "");
  const [busy, setBusy] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ id: string; key: string } | null>(null);

  const count = charCount(content);
  const over = count > MAX_COMMENT_CHARS;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert(t("本文を入力してください"));
      return;
    }
    if (over) {
      alert(t("本文は全角{n}文字（半角{m}文字）以内です", { n: Math.floor(MAX_COMMENT_CHARS / 2), m: MAX_COMMENT_CHARS }));
      return;
    }
    const token = getUserToken();
    if (!token) {
      alert(t("書き込みには利用規約への同意が必要です。ページを再読み込みしてください。"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mail, content, userToken: token, parentPostId: parentPostId ?? null }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.deleteKey && data.post?.id) {
          try {
            localStorage.setItem(`sk-metadelkey-${data.post.id}`, data.deleteKey);
          } catch {
            /* noop */
          }
          setIssuedKey({ id: data.post.id, key: data.deleteKey });
          onKey?.({ id: data.post.id, key: data.deleteKey });
        }
        setName("");
        setMail("");
        setContent(parentNumber ? `>>${parentNumber}\n` : "");
        onPosted();
      } else {
        alert(data.error || t("書き込みに失敗しました"));
      }
    } catch {
      alert(t("書き込みに失敗しました"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${parentPostId ? "mt-3" : "mt-6"} bg-panel2 border border-line rounded-xl p-4 space-y-3`}>
      {parentNumber && (
        <p className="text-sm font-bold text-mut">{t(">>{n} への返信", { n: parentNumber })}</p>
      )}
      {issuedKey && (
        <div className="bg-good/10 border border-good/40 rounded-lg p-3">
          <p className="text-sm font-bold">{t("投稿しました。削除キーはこちら:")}</p>
          <p className="font-mono text-lg tracking-widest mt-1 select-all">{issuedKey.key}</p>
          <p className="text-xs text-mut mt-1">{t("このキーで後から投稿を削除できます。メモ推奨。")}</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 64))}
          placeholder={t("名前（任意・#でトリップ）")}
          title={t("「名前#パスワード」で ◆から始まるトリップ（2ch互換の個人証明）が付きます")}
          className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <input
          type="text"
          value={mail}
          onChange={(e) => setMail(e.target.value.slice(0, 64))}
          placeholder={t("メール（sageでageない）")}
          className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
        />
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentNumber ? t(">>{n}\n返信内容を入力...", { n: parentNumber }) : t("要望・バグ報告・その他を入力...（全角500文字まで）")}
        rows={parentNumber ? 3 : 4}
        className="w-full px-3 py-2 rounded-lg border border-line text-sm resize-y focus:outline-none focus:ring-2 focus:ring-x/60"
      />
      <div className="flex items-center justify-between gap-3">
        <span className={`text-xs ${over ? "text-bad font-bold" : "text-mut"}`}>
          {count}/{MAX_COMMENT_CHARS}
        </span>
        <button
          type="submit"
          disabled={busy || over || !content.trim()}
          className="px-6 py-2.5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {busy ? t("送信中...") : parentPostId ? t("返信を投稿") : t("書き込む")}
        </button>
      </div>
    </form>
  );
}

// ---------------- 投稿表示（親） ----------------

function PostItem({ post, onUpdate }: { post: MetaPostWithReplies; onUpdate: () => void }) {
  const t = useT();
  const [local, setLocal] = useState(post);
  const [myReaction, setMyReaction] = useState<"good" | "bad" | null>(null);
  const [showReply, setShowReply] = useState(false);

  useEffect(() => {
    setLocal(post);
    try {
      const voted = JSON.parse(localStorage.getItem("votedMetaPosts") ?? "{}");
      setMyReaction(voted[post.id] ?? null);
    } catch {
      setMyReaction(null);
    }
  }, [post]);

  const react = async (type: "good" | "bad") => {
    const token = getUserToken() ?? "";
    try {
      const res = await fetch("/api/meta/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, reactionType: type, userToken: token }),
      });
      const data = await res.json();
      if (!data.success) return;
      setLocal({ ...local, good_count: data.good, bad_count: data.bad });
      setMyReaction(data.myReaction);
      const voted = JSON.parse(localStorage.getItem("votedMetaPosts") ?? "{}");
      if (data.myReaction) voted[post.id] = data.myReaction;
      else delete voted[post.id];
      localStorage.setItem("votedMetaPosts", JSON.stringify(voted));
    } catch {
      /* noop */
    }
  };

  const del = async () => {
    let key = "";
    try {
      key = localStorage.getItem(`sk-metadelkey-${post.id}`) ?? "";
    } catch {
      /* noop */
    }
    if (key) {
      if (!confirm(t("この投稿を削除しますか？"))) return;
    } else {
      key = window.prompt(t("削除キーを入力してください")) ?? "";
      if (!key.trim()) return;
    }
    try {
      const res = await fetch("/api/meta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, deleteKey: key }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.removeItem(`sk-metadelkey-${post.id}`);
        } catch {
          /* noop */
        }
        alert(t("投稿を削除しました"));
        onUpdate();
      } else {
        alert(data.error || t("削除できませんでした"));
      }
    } catch {
      alert(t("削除できませんでした"));
    }
  };

  return (
    <div id={`c${post.post_number}`} className="bg-panel2 border border-line rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-mut flex-wrap">
          <span className="text-mut text-xs">#{post.post_number}</span>
          <span className="font-bold text-txt text-sm"><EmojiText text={post.name || t("名無しさん")} /></span>
          {isSageMail(post.mail) && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut"
              title={t("sage（2ch互換板のスレ一覧で上がらない投稿）")}
            >
              sage
            </span>
          )}
          <span>{fmtTime2ch(post.created_at)}</span>
          <span className="font-mono text-[11px]">ID:{post.anon_id}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(post.id).then(() => alert(t("投稿IDをコピーしました"))).catch(() => {});
            }}
            className="text-[11px] text-mut hover:text-x underline"
          >
            {t("IDをコピー")}
          </button>
        </div>
        <button onClick={del} className="text-mut hover:text-bad transition shrink-0" title={t("投稿を削除")}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <TranslateBox text={post.content} variant="comment" className="whitespace-pre-wrap text-sm leading-relaxed mb-3" />
      <LinkEmbeds text={post.content} />

      <div className="flex items-center gap-4 text-sm mt-2">
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
        <button
          onClick={() => setShowReply(!showReply)}
          className="flex items-center gap-1 text-mut hover:text-x transition"
        >
          <MessageCircle className="w-4 h-4" />
          {t("返信")}
        </button>
      </div>

      {local.replies.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-line space-y-3">
          {local.replies.map((r) => (
            <ReplyItem key={r.id} reply={r} parentNumber={post.post_number} onUpdate={onUpdate} />
          ))}
        </div>
      )}

      {showReply && (
        <MetaForm
          parentPostId={post.id}
          parentNumber={post.post_number}
          onPosted={() => {
            setShowReply(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}

// ---------------- 投稿表示（返信） ----------------

function ReplyItem({ reply, parentNumber, onUpdate }: { reply: MetaPost; parentNumber: number; onUpdate: () => void }) {
  const t = useT();
  const [local, setLocal] = useState(reply);
  const [myReaction, setMyReaction] = useState<"good" | "bad" | null>(null);

  useEffect(() => {
    setLocal(reply);
    try {
      const voted = JSON.parse(localStorage.getItem("votedMetaPosts") ?? "{}");
      setMyReaction(voted[reply.id] ?? null);
    } catch {
      setMyReaction(null);
    }
  }, [reply]);

  const react = async (type: "good" | "bad") => {
    const token = getUserToken() ?? "";
    try {
      const res = await fetch("/api/meta/reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: reply.id, reactionType: type, userToken: token }),
      });
      const data = await res.json();
      if (!data.success) return;
      setLocal({ ...local, good_count: data.good, bad_count: data.bad });
      setMyReaction(data.myReaction);
      const voted = JSON.parse(localStorage.getItem("votedMetaPosts") ?? "{}");
      if (data.myReaction) voted[reply.id] = data.myReaction;
      else delete voted[reply.id];
      localStorage.setItem("votedMetaPosts", JSON.stringify(voted));
    } catch {
      /* noop */
    }
  };

  const del = async () => {
    let key = "";
    try {
      key = localStorage.getItem(`sk-metadelkey-${reply.id}`) ?? "";
    } catch {
      /* noop */
    }
    if (key) {
      if (!confirm(t("この投稿を削除しますか？"))) return;
    } else {
      key = window.prompt(t("削除キーを入力してください")) ?? "";
      if (!key.trim()) return;
    }
    try {
      const res = await fetch("/api/meta", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reply.id, deleteKey: key }),
      });
      const data = await res.json();
      if (data.success) {
        try {
          localStorage.removeItem(`sk-metadelkey-${reply.id}`);
        } catch {
          /* noop */
        }
        alert(t("投稿を削除しました"));
        onUpdate();
      } else {
        alert(data.error || t("削除できませんでした"));
      }
    } catch {
      alert(t("削除できませんでした"));
    }
  };

  return (
    <div id={`c${reply.post_number}`} className="border border-line rounded-lg p-3 bg-panel2/40 text-sm">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className="text-mut text-xs">&gt;&gt;{parentNumber}</span>
        <span className="font-medium"><EmojiText text={reply.name || t("名無しさん")} /></span>
        {isSageMail(reply.mail) && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut"
            title={t("sage（2ch互換板のスレ一覧で上がらない投稿）")}
          >
            sage
          </span>
        )}
        <span className="text-xs text-mut">{fmtTime2ch(reply.created_at)}</span>
        <span className="text-[11px] text-mut font-mono">ID:{reply.anon_id}</span>
        <span className="ml-auto" />
      </div>
      <TranslateBox text={reply.content} variant="comment" className="whitespace-pre-wrap mb-2" />
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
        <button onClick={del} className="flex items-center gap-1 text-mut hover:text-bad transition" title={t("投稿を削除")}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
