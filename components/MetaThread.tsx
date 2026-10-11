"use client";

import { useState } from "react";
import { getUserToken } from "@/lib/client-token";
import { MessageSquare } from "lucide-react";
import { fmtTime2ch } from "@/lib/format";
import EmojiText from "./EmojiText";
import LinkEmbeds from "./LinkEmbeds";
import { MAX_COMMENT_CHARS } from "@/lib/constants";
import { charCount } from "@/lib/validate";
import { useT } from "@/lib/i18n-client";
import TranslateBox from "@/components/TranslateBox";

type MetaPost = {
  id: string;
  name: string | null;
  content: string;
  created_at: string;
  anon_id: string;
};

export default function MetaThread({ initialPosts }: { initialPosts: MetaPost[] }) {
  const t = useT();
  const [posts, setPosts] = useState<MetaPost[]>(initialPosts);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [issuedKey, setIssuedKey] = useState<{ id: string; key: string } | null>(null);
  const [delId, setDelId] = useState("");
  const [delKey, setDelKey] = useState("");

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
        body: JSON.stringify({ name, mail, content, userToken: token }),
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
        }
        // 最新一覧を取り直す（ID表示はサーバー側で計算されるため）
        const r2 = await fetch("/api/meta");
        const d2 = await r2.json();
        if (d2.success) setPosts(d2.posts);
        setName("");
        setMail("");
        setContent("");
      } else {
        alert(data.error || t("書き込みに失敗しました"));
      }
    } catch {
      alert(t("書き込みに失敗しました"));
    } finally {
      setBusy(false);
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
        const r2 = await fetch("/api/meta");
        const d2 = await r2.json();
        if (d2.success) setPosts(d2.posts);
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

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-mut text-center py-8">
            {t("まだ書き込みがありません。最初の1件をどうぞ。")}
          </p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="bg-panel2 border border-line rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-mut mb-1.5 flex-wrap">
                <span className="font-bold text-txt text-sm"><EmojiText text={p.name || t("名無しさん")} /></span>
                <span>{fmtTime2ch(p.created_at)}</span>
                <span className="font-mono text-[11px]">ID:{p.anon_id}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(p.id).then(() => alert(t("投稿IDをコピーしました"))).catch(() => {});
                  }}
                  className="text-[11px] text-mut hover:text-x underline"
                >
                  {t("IDをコピー")}
                </button>
              </div>
              <TranslateBox text={p.content} variant="plain" className="text-sm whitespace-pre-wrap break-words leading-relaxed" />
              <LinkEmbeds text={p.content} />
            </div>
          ))
        )}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("名前（任意・#でトリップ）")}
            title={t("「名前#パスワード」で ◆から始まるトリップ（2ch互換の個人証明）が付きます")}
            className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
          <input
            type="text"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder={t("メール（sageでageない）")}
            className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("要望・バグ報告・その他を入力...（全角140文字まで）")}
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-line text-sm resize-y focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${over ? "text-bad font-bold" : "text-mut"}`}>
            {count}/{MAX_COMMENT_CHARS}
          </span>
          <button
            type="submit"
            disabled={busy || over || !content.trim()}
            className="px-6 py-2.5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? t("送信中...") : t("書き込む")}
          </button>
        </div>
      </form>

      {issuedKey && (
        <div className="mt-4 bg-good/10 border border-good/40 rounded-xl p-4 text-sm">
          <div className="font-bold mb-1">{t("投稿しました。削除キーはこちら:")}</div>
          <div className="font-mono text-lg tracking-wider">{issuedKey.key}</div>
          <div className="text-xs text-mut mt-1">{t("このキーで後から投稿を削除できます。メモ推奨。")}</div>
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
