"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  LogOut,
  AlertCircle,
  Trash2,
  EyeOff,
  Eye,
  Search,
  RefreshCw,
  Pencil,
  UserPlus,
  X,
} from "lucide-react";
import { formatJST } from "@/lib/format";
import { CATEGORIES } from "@/lib/constants";

type Report = {
  id: string;
  comment_id: string;
  reason: string | null;
  details: string | null;
  created_at: string;
  comment_content: string;
  comment_name: string | null;
  comment_number: number;
  comment_vote_type: "like" | "dislike";
  comment_person_id: string;
  person_name: string | null;
};

type PollReport = {
  id: string;
  poll_comment_id: string;
  reason: string | null;
  details: string | null;
  created_at: string;
  comment_content: string;
  comment_name: string | null;
  comment_number: number;
  poll_id: string;
  poll_title: string | null;
  voted_option: string | null;
};

type AdminComment = {
  id: string;
  person_id: string;
  comment_number: number;
  name: string | null;
  vote_type: "like" | "dislike";
  content: string;
  created_at: string;
  is_hidden: boolean;
  person_name: string | null;
};

type Analytics = {
  date: string;
  comments: number;
  votes: number;
  like_votes: number;
  dislike_votes: number;
  reactions: number;
  good_reactions: number;
  bad_reactions: number;
  evaluations: number;
};

type AdminPerson = {
  id: string;
  name: string;
  handle: string | null;
  category: string;
  tags: string[];
  description: string;
  avatar_url: string | null;
  is_hidden: boolean;
  source: string;
  created_at: string;
  x_status?: string | null;
  x_checked_at?: string | null;
};

type Tab = "reports" | "comments" | "votes" | "people" | "analytics";

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("reports");

  useEffect(() => {
    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((d) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthed(true);
        setPassword("");
      } else {
        alert(data.error || "ログインに失敗しました");
      }
    } catch {
      alert("ログインに失敗しました");
    }
  };

  const logout = async () => {
    if (!confirm("ログアウトしますか？")) return;
    await fetch("/api/admin/auth", { method: "DELETE" });
    setAuthed(false);
  };

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-mut">読み込み中...</div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-panel border border-line rounded-2xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-x" />
          </div>
          <h1 className="text-xl font-black text-center mb-6">管理者コントロールパネル</h1>
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-x text-white font-bold hover:opacity-90 transition"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-panel">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-x" />
            <h1 className="text-xl font-black">管理者コントロールパネル</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-line text-sm text-mut hover:text-txt transition"
            >
              サイトに戻る
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl border border-line text-sm text-mut hover:text-txt transition flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            [
              ["reports", "通報管理"],
              ["comments", "コメント"],
              ["votes", "票数管理"],
              ["people", "人物管理"],
              ["analytics", "アナリティクス"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition ${
                tab === t ? "bg-x text-white border-x" : "bg-panel2 text-mut border-line hover:text-txt"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "reports" && <ReportsTab />}
        {tab === "comments" && <CommentsTab />}
        {tab === "votes" && <VotesTab />}
        {tab === "people" && <PeopleTab />}
        {tab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}

// ---------------- 通報 ----------------

function ReportsTab() {
  const [reports, setReports] = useState<Report[]>([]);
  const [pollReports, setPollReports] = useState<PollReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
        setPollReports(data.pollReports ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string, payload: Record<string, string>) => {
    const res = await fetch("/api/admin/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json();
    if (data.success) load();
    else alert(data.error || "失敗しました");
  };

  if (loading) return <p className="text-mut">読み込み中...</p>;
  if (reports.length === 0 && pollReports.length === 0)
    return <p className="text-mut py-10 text-center">通報はありません</p>;

  return (
    <div className="space-y-4">
      {reports.map((r) => (
        <div key={r.id} className="bg-panel border border-line border-l-4 border-l-bad rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-bad shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-mut mb-1">通報日時: {formatJST(r.created_at, "yyyy-MM-dd HH:mm:ss")}</p>
              <p className="text-sm mb-1">
                <span className="font-bold">理由:</span> {r.reason || "不明"}
              </p>
              {r.details && (
                <p className="text-sm text-mut mb-2 bg-panel2 rounded-lg px-3 py-2">詳細: {r.details}</p>
              )}
              <div className="bg-panel2 rounded-lg p-3 mb-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap mb-1 text-xs text-mut">
                  <Link href={`/person/${r.comment_person_id}`} className="text-x hover:underline">
                    {r.person_name ?? r.comment_person_id}
                  </Link>
                  <span>#{r.comment_number}</span>
                  <span>{r.comment_name || "匿名"}</span>
                  <span className={r.comment_vote_type === "like" ? "text-like" : "text-dislike"}>
                    {r.comment_vote_type === "like" ? "好き派" : "嫌い派"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap">{r.comment_content}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (confirm("このコメントを削除しますか？")) act("deleteComment", { commentId: r.comment_id, reportId: r.id });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-bad text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  コメント削除
                </button>
                <button
                  onClick={() => {
                    if (confirm("このコメントを非表示にしますか？")) act("hideComment", { commentId: r.comment_id, reportId: r.id });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  非表示にする
                </button>
                <button
                  onClick={() => {
                    if (confirm("この通報を却下しますか？")) act("dismiss", { reportId: r.id });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-panel2 border border-line text-xs text-mut hover:text-txt transition"
                >
                  通報を却下
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {pollReports.length > 0 && (
        <div className="pt-2">
          <h3 className="font-bold text-sm mb-3 text-mut">投票トークの通報</h3>
          <div className="space-y-4">
            {pollReports.map((r) => (
              <div key={r.id} className="bg-panel border border-line border-l-4 border-l-bad rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-bad shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-mut mb-1">通報日時: {formatJST(r.created_at, "yyyy-MM-dd HH:mm:ss")}</p>
                    <p className="text-sm mb-1">
                      <span className="font-bold">理由:</span> {r.reason || "不明"}
                    </p>
                    {r.details && (
                      <p className="text-sm text-mut mb-2 bg-panel2 rounded-lg px-3 py-2">詳細: {r.details}</p>
                    )}
                    <div className="bg-panel2 rounded-lg p-3 mb-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap mb-1 text-xs text-mut">
                        <Link href={`/polls/${r.poll_id}`} className="text-x hover:underline">
                          {r.poll_title ?? "投票トーク"}
                        </Link>
                        <span>#{r.comment_number}</span>
                        <span>{r.comment_name || "匿名"}</span>
                        {r.voted_option && <span className="text-x">「{r.voted_option}」に投票</span>}
                      </div>
                      <p className="whitespace-pre-wrap">{r.comment_content}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (confirm("このコメントを削除しますか？"))
                            act("deletePollComment", { pollCommentId: r.poll_comment_id, reportId: r.id });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-bad text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        コメント削除
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("このコメントを非表示にしますか？"))
                            act("hidePollComment", { pollCommentId: r.poll_comment_id });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        非表示にする
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("この通報を却下しますか？")) act("dismissPollReport", { reportId: r.id });
                        }}
                        className="px-3 py-1.5 rounded-lg bg-panel2 border border-line text-xs text-mut hover:text-txt transition"
                      >
                        通報を却下
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- コメント ----------------

function CommentsTab() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comments");
      const data = await res.json();
      if (data.success) setComments(data.comments);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: "hide" | "delete", commentId: string) => {
    const label = action === "hide" ? "非表示に" : "削除";
    if (!confirm(`このコメントを${label}しますか？`)) return;
    const res = await fetch("/api/admin/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, commentId }),
    });
    const data = await res.json();
    if (data.success) load();
    else alert(data.error || "失敗しました");
  };

  if (loading) return <p className="text-mut">読み込み中...</p>;
  if (comments.length === 0) return <p className="text-mut py-10 text-center">コメントはありません</p>;

  return (
    <div className="space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="bg-panel border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 flex-wrap text-xs text-mut mb-2">
            <Link href={`/person/${c.person_id}`} className="text-x hover:underline">
              {c.person_name ?? c.person_id}
            </Link>
            <span>#{c.comment_number}</span>
            <span className="text-txt">{c.name || "匿名"}</span>
            <span className={c.vote_type === "like" ? "text-like" : "text-dislike"}>
              {c.vote_type === "like" ? "好き派" : "嫌い派"}
            </span>
            <span>{formatJST(c.created_at, "yyyy-MM-dd HH:mm")}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap mb-3">{c.content}</p>
          <div className="flex gap-2">
            <button
              onClick={() => act("hide", c.id)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
            >
              <EyeOff className="w-3.5 h-3.5" />
              非表示
            </button>
            <button
              onClick={() => act("delete", c.id)}
              className="px-3 py-1.5 rounded-lg bg-bad text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- 票数 ----------------

function VotesTab() {
  const [personId, setPersonId] = useState("");
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId.trim()) return;
    if (!confirm(`「${personId}」の票を 好き:${likes} / 嫌い:${dislikes} に変更しますか？\n（既存の票は全削除して入れ直します）`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: personId.trim(), likes, dislikes }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`変更しました（好き: ${data.likes} / 嫌い: ${data.dislikes}）`);
      } else {
        alert(data.error || "失敗しました");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-panel border border-line rounded-2xl p-6 max-w-lg space-y-4">
      <h2 className="font-bold">票数管理</h2>
      <p className="text-xs text-mut">
        人物IDを指定して、好き/嫌いの票数を直接設定できます（既存票は削除して入れ直します）。
      </p>
      <div>
        <label className="block text-sm font-bold mb-1.5">人物ID</label>
        <input
          type="text"
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          placeholder="例: maebahesioru2"
          className="w-full px-3 py-2.5 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1.5">好き票数</label>
          <input
            type="number"
            min={0}
            value={likes}
            onChange={(e) => setLikes(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2.5 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">嫌い票数</label>
          <input
            type="number"
            min={0}
            value={dislikes}
            onChange={(e) => setDislikes(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2.5 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 rounded-xl bg-x text-white font-bold hover:opacity-90 transition disabled:opacity-50"
      >
        {busy ? "処理中..." : "票数を変更"}
      </button>
    </form>
  );
}

// ---------------- 人物 ----------------

const EMPTY_FORM = {
  name: "",
  handle: "",
  category: "その他",
  tags: "",
  description: "",
  avatarUrl: "",
  hidden: false,
};

function PeopleTab() {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [showCreate, setShowCreate] = useState(false);
  const [createId, setCreateId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/people?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) setPeople(data.people);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  const post = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.json();
  };

  const startEdit = (p: AdminPerson) => {
    setEditId(p.id);
    setShowCreate(false);
    setForm({
      name: p.name,
      handle: p.handle ?? "",
      category: p.category,
      tags: p.tags.join(", "),
      description: p.description,
      avatarUrl: p.avatar_url ?? "",
      hidden: p.is_hidden,
    });
  };

  const saveEdit = async () => {
    if (!editId) return;
    setBusy(true);
    try {
      const data = await post({
        action: "update",
        id: editId,
        fields: {
          name: form.name,
          handle: form.handle,
          category: form.category,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          description: form.description,
          avatar_url: form.avatarUrl,
          is_hidden: form.hidden,
        },
      });
      if (data.success) {
        setEditId(null);
        load(q);
      } else {
        alert(data.error || "更新に失敗しました");
      }
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!form.name.trim()) {
      alert("名前を入力してください");
      return;
    }
    setBusy(true);
    try {
      const data = await post({
        action: "create",
        id: createId.trim(),
        name: form.name,
        handle: form.handle,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        description: form.description,
        avatarUrl: form.avatarUrl,
      });
      if (data.success) {
        alert("作成しました");
        setShowCreate(false);
        setCreateId("");
        setForm({ ...EMPTY_FORM });
        load(q);
      } else {
        alert(data.error || "作成に失敗しました");
      }
    } finally {
      setBusy(false);
    }
  };

  const enrich = async (p: AdminPerson) => {
    if (!confirm(`「${p.name}」のX情報（アバター等）を取得しますか？`)) return;
    const data = await post({ action: "enrich", id: p.id });
    if (data.success) {
      alert("取得しました");
      load(q);
    } else {
      alert(data.error || "取得に失敗しました");
    }
  };

  const del = async (p: AdminPerson) => {
    if (!confirm(`「${p.name}」を削除しますか？\n\n※投票・コメントも全て削除されます（取り消せません）`)) return;
    const data = await post({ action: "delete", id: p.id });
    if (data.success) load(q);
    else alert(data.error || "削除に失敗しました");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                load(q);
              }
            }}
            placeholder="名前・IDで検索（Enterで実行）"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
          />
        </div>
        <button
          onClick={() => load(q)}
          className="px-4 py-2.5 rounded-xl bg-panel2 border border-line text-sm hover:border-line2 transition"
        >
          検索
        </button>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditId(null);
            setForm({ ...EMPTY_FORM });
          }}
          className="px-4 py-2.5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          新規作成
        </button>
      </div>

      {(editId || showCreate) && (
        <div className="bg-panel border border-x/40 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">{editId ? `編集: ${editId}` : "新規人物を作成"}</h3>
            <button
              onClick={() => {
                setEditId(null);
                setShowCreate(false);
              }}
              className="text-mut hover:text-txt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {showCreate && (
            <input
              type="text"
              value={createId}
              onChange={(e) => setCreateId(e.target.value)}
              placeholder="ID（英数字とハイフン。空なら自動生成）"
              className="w-full px-3 py-2 rounded-xl border border-line text-sm"
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="名前 *"
              className="px-3 py-2 rounded-xl border border-line text-sm"
            />
            <input
              type="text"
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value })}
              placeholder="Xハンドル（@なし）"
              className="px-3 py-2 rounded-xl border border-line text-sm"
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2 rounded-xl border border-line text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="タグ（カンマ区切り）"
              className="px-3 py-2 rounded-xl border border-line text-sm"
            />
          </div>
          <input
            type="text"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="アバター画像URL（https://...）"
            className="w-full px-3 py-2 rounded-xl border border-line text-sm"
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, 500) })}
            placeholder="説明"
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-line text-sm resize-y"
          />
          {editId && (
            <label className="flex items-center gap-2 text-sm text-mut cursor-pointer">
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(e) => setForm({ ...form, hidden: e.target.checked })}
                className="w-4 h-4 accent-sky-500"
              />
              非表示にする
            </label>
          )}
          <button
            onClick={editId ? saveEdit : create}
            disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {busy ? "処理中..." : editId ? "更新する" : "作成する"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-mut">読み込み中...</p>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <div
              key={p.id}
              className={`bg-panel border rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap ${
                p.is_hidden ? "border-line opacity-50" : "border-line"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/person/${p.id}`} className="font-bold text-sm hover:text-x transition">
                    {p.name}
                  </Link>
                  <span className="text-xs text-mut">@{p.handle ?? p.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-panel2 border border-line text-mut">
                    {p.category}
                  </span>
                  {p.is_hidden && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bad/20 text-bad">非表示</span>
                  )}
                  <span className="text-[10px] text-mut">{p.source}</span>
                  {p.x_status === "missing" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      X未確認
                    </span>
                  )}
                  {p.x_status === "reused" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bad/20 text-bad">ID重複</span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => enrich(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-panel2 border border-line text-xs text-mut hover:text-txt transition flex items-center gap-1"
                  title="X情報を取得"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => startEdit(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-panel2 border border-line text-xs text-mut hover:text-txt transition flex items-center gap-1"
                  title="編集"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={async () => {
                    const data = await post({ action: "update", id: p.id, fields: { is_hidden: !p.is_hidden } });
                    if (data.success) load(q);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-panel2 border border-line text-xs text-mut hover:text-txt transition"
                  title={p.is_hidden ? "再表示" : "非表示"}
                >
                  {p.is_hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => del(p)}
                  className="px-2.5 py-1.5 rounded-lg bg-bad/20 border border-bad/40 text-xs text-bad hover:bg-bad/30 transition"
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {people.length === 0 && <p className="text-mut text-center py-8">該当なし</p>}
        </div>
      )}
    </div>
  );
}

// ---------------- アナリティクス ----------------

function AnalyticsTab() {
  const [date, setDate] = useState(() => {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(async (d: string) => {
    try {
      const res = await fetch(`/api/analytics?date=${d}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    load(date);
  }, [date, load]);

  const cells: [string, number, string][] = data
    ? [
        ["コメント数", data.comments, "text-x"],
        ["総投票数", data.votes, "text-good"],
        ["好き投票", data.like_votes, "text-like"],
        ["嫌い投票", data.dislike_votes, "text-dislike"],
        ["リアクション", data.reactions, "text-amber-400"],
        ["グッド", data.good_reactions, "text-good"],
        ["バッド", data.bad_reactions, "text-bad"],
        ["8項目評価", data.evaluations, "text-gold"],
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-bold">日付（JST）:</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 rounded-xl border border-line text-sm"
        />
      </div>
      {data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cells.map(([label, value, color]) => (
            <div key={label} className="bg-panel border border-line rounded-2xl p-4">
              <p className="text-xs text-mut mb-1">{label}</p>
              <p className={`text-2xl font-black ${color}`}>{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-mut">読み込み中...</p>
      )}
    </div>
  );
}
