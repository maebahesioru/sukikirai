"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Plus, X, Search } from "lucide-react";
import type { PollType } from "@/lib/types";

type RelatedPerson = { id: string; name: string; handle: string | null; avatar_url: string | null };

const POLL_TYPES: { key: PollType; label: string; desc: string }[] = [
  { key: "two_choice", label: "2択", desc: "選択肢2つ。他の人は追加できません" },
  { key: "three_plus_fixed", label: "3択以上（固定）", desc: "選択肢3つ以上。他の人は追加できません" },
  { key: "three_plus_open", label: "3択以上（追加可）", desc: "他の人も選択肢を追加できます（最大20個・1人3個まで）" },
];

export default function CreatePollForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pollType, setPollType] = useState<PollType>("two_choice");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [related, setRelated] = useState<RelatedPerson[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<RelatedPerson[]>([]);
  const [busy, setBusy] = useState(false);

  const minOptions = pollType === "two_choice" ? 2 : 3;

  const setOption = (i: number, v: string) => {
    const next = [...options];
    next[i] = v;
    setOptions(next);
  };
  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
  };
  const removeOption = (i: number) => {
    if (options.length <= minOptions) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const search = async () => {
    const q = searchQ.trim();
    if (!q) return;
    try {
      const res = await fetch(`/api/people/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.people.slice(0, 6));
      }
    } catch {
      /* noop */
    }
  };

  const addRelated = (p: RelatedPerson) => {
    if (related.length >= 5 || related.some((r) => r.id === p.id)) return;
    setRelated([...related, p]);
    setSearchResults([]);
    setSearchQ("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim()) {
      alert("タイトルを入力してください");
      return;
    }
    if (cleaned.length < minOptions) {
      alert(`選択肢を${minOptions}つ以上入力してください`);
      return;
    }
    const token = Cookies.get("user_token");
    if (!token) {
      alert("作成には利用規約への同意が必要です。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          pollType,
          options: cleaned,
          relatedPersonIds: related.map((r) => r.id),
          userToken: token,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || "作成に失敗しました");
        return;
      }
      router.push(`/polls/${data.pollId}`);
    } catch {
      alert("作成に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-panel border border-line rounded-2xl p-6 space-y-5">
      <h1 className="text-xl font-black">投票トークを作成</h1>

      <div>
        <label className="block text-sm font-bold mb-1.5">
          タイトル <span className="text-bad">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 200))}
          placeholder="例: 一番好きなヒカマーは？"
          className="w-full px-3 py-2.5 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-1.5">説明（任意）</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={2}
          placeholder="補足説明があれば"
          className="w-full px-3 py-2.5 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">投票形式</label>
        <div className="space-y-2">
          {POLL_TYPES.map((t) => (
            <label
              key={t.key}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                pollType === t.key ? "border-x bg-xsoft" : "border-line bg-panel2 hover:border-line2"
              }`}
            >
              <input
                type="radio"
                checked={pollType === t.key}
                onChange={() => {
                  setPollType(t.key);
                  if (t.key !== "two_choice" && options.length < 3) {
                    setOptions([...options, ""].slice(0, 3));
                  }
                }}
                className="mt-0.5 accent-sky-500"
              />
              <div>
                <p className="text-sm font-bold">{t.label}</p>
                <p className="text-xs text-mut">{t.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold mb-2">
          選択肢 <span className="text-bad">*</span>
        </label>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={o}
                onChange={(e) => setOption(i, e.target.value.slice(0, 100))}
                placeholder={`選択肢 ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
              />
              {options.length > minOptions && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="px-2.5 rounded-xl border border-line text-mut hover:text-bad transition"
                  aria-label="削除"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < 10 && (
          <button
            type="button"
            onClick={addOption}
            className="mt-2 text-sm text-x hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            選択肢を追加
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold mb-1.5">関連する人物（任意・最大5人）</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  search();
                }
              }}
              placeholder="名前・IDで検索"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={search}
            className="px-4 rounded-xl bg-panel2 border border-line text-sm hover:border-line2 transition"
          >
            検索
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1 bg-panel2 border border-line rounded-xl p-2">
            {searchResults.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addRelated(p)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-panel transition"
              >
                {p.name}
                {p.handle && <span className="text-mut text-xs ml-2">@{p.handle}</span>}
              </button>
            ))}
          </div>
        )}
        {related.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {related.map((p) => (
              <span
                key={p.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-panel2 border border-line text-sm"
              >
                {p.name}
                <button
                  type="button"
                  onClick={() => setRelated(related.filter((r) => r.id !== p.id))}
                  className="text-mut hover:text-bad"
                  aria-label="削除"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className={`w-full py-3 rounded-xl font-bold text-white transition ${
          busy ? "bg-panel2 text-mut cursor-not-allowed" : "bg-gradient-to-r from-x to-dislike hover:opacity-90"
        }`}
      >
        {busy ? "作成中..." : "投票トークを作成"}
      </button>
    </form>
  );
}
