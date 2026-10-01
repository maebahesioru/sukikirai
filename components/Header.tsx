"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Heart, Menu, X } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

const NAV = [
  { href: "/ranking/popularity", label: "ランキング" },
  { href: "/people", label: "人物一覧" },
  { href: "/polls", label: "投票トーク" },
  { href: "/search", label: "Xユーザーを追加" },
];

export default function Header() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-3 py-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-like to-dislike flex items-center justify-center">
              <Heart className="w-4 h-4 text-white fill-white" />
            </span>
            <span className="font-bold text-lg hidden sm:block">{SITE_NAME}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-full text-sm text-mut hover:text-txt hover:bg-panel2 transition"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={submit} className="flex-1 min-w-0 ml-auto max-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="@ID・名前で検索"
                className="w-full pl-9 pr-3 py-2 rounded-full border border-line bg-panel2 text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
              />
            </div>
          </form>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-mut hover:text-txt"
            aria-label="メニュー"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {open && (
          <nav className="md:hidden flex flex-col gap-1 pb-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm text-mut hover:text-txt hover:bg-panel2 transition"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
