"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HeroSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-xl">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mut" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="@IDまたは名前で検索（未登録のXユーザーは自動追加）"
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-line bg-panel focus:outline-none focus:ring-2 focus:ring-x/60 text-sm"
        />
      </div>
      <button
        type="submit"
        className="px-5 rounded-2xl bg-x text-white font-bold text-sm hover:opacity-90 transition"
      >
        検索
      </button>
    </form>
  );
}
