"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { MessageSquare } from "lucide-react";
import { fmtTime2ch } from "@/lib/format";
import { MAX_COMMENT_CHARS } from "@/lib/constants";
import { charCount } from "@/lib/validate";

type MetaPost = {
  id: string;
  name: string | null;
  content: string;
  created_at: string;
  anon_id: string;
};

export default function MetaThread({ initialPosts }: { initialPosts: MetaPost[] }) {
  const [posts, setPosts] = useState<MetaPost[]>(initialPosts);
  const [name, setName] = useState("");
  const [mail, setMail] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const count = charCount(content);
  const over = count > MAX_COMMENT_CHARS;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert("本文を入力してください");
      return;
    }
    if (over) {
      alert(`本文は全角${Math.floor(MAX_COMMENT_CHARS / 2)}文字（半角${MAX_COMMENT_CHARS}文字）以内です`);
      return;
    }
    const token = Cookies.get("user_token");
    if (!token) {
      alert("書き込みには利用規約への同意が必要です。ページを再読み込みしてください。");
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
        // 最新一覧を取り直す（ID表示はサーバー側で計算されるため）
        const r2 = await fetch("/api/meta");
        const d2 = await r2.json();
        if (d2.success) setPosts(d2.posts);
        setName("");
        setMail("");
        setContent("");
      } else {
        alert(data.error || "書き込みに失敗しました");
      }
    } catch {
      alert("書き込みに失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageSquare className="w-6 h-6 text-good" />
        <h1 className="text-2xl font-black">管理スレ</h1>
      </div>
      <p className="text-sm text-mut leading-relaxed mb-5">
        機能要望・バグ報告・その他、運営への連絡はここにどうぞ。2ch専ブラ（Siki等）からも書き込めます。
      </p>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-mut text-center py-8">
            まだ書き込みがありません。最初の1件をどうぞ。
          </p>
        ) : (
          posts.map((p) => (
            <div key={p.id} className="bg-panel2 border border-line rounded-xl p-4">
              <div className="flex items-center gap-2 text-xs text-mut mb-1.5 flex-wrap">
                <span className="font-bold text-txt text-sm">{p.name || "名無しさん"}</span>
                <span>{fmtTime2ch(p.created_at)}</span>
                <span className="font-mono text-[11px]">ID:{p.anon_id}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{p.content}</p>
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
            placeholder="名前（任意・#でトリップ）"
            title="「名前#パスワード」で ◆から始まるトリップ（2ch互換の個人証明）が付きます"
            className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
          <input
            type="text"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            placeholder="メール（sageでageない）"
            className="px-3 py-2 rounded-lg border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="要望・バグ報告・その他を入力...（全角140文字まで）"
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
            {busy ? "送信中..." : "書き込む"}
          </button>
        </div>
      </form>
    </section>
  );
}
