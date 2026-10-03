"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { Search } from "lucide-react";

type Item = { id: string; name: string; handle: string | null; avatar_url: string | null };

/**
 * 入力中に候補が出る検索ボックス（結果ページとは別のドロップダウン）。
 * Enter/検索ボタン → onSubmit(q) で通常の検索結果ページへ。
 * 候補クリック / Enter(候補選択中) → 人物ページへ直行。
 */
export default function SearchSuggest({
  formClassName = "",
  inputClassName,
  iconClassName = "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mut",
  placeholder,
  onSubmit,
  submitButton,
}: {
  formClassName?: string;
  inputClassName: string;
  iconClassName?: string;
  placeholder: string;
  onSubmit: (q: string) => void;
  submitButton?: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const router = useRouter();
  const composing = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blurTimer.current) clearTimeout(blurTimer.current);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const fetchSuggest = (query: string) => {
    abortRef.current?.abort();
    if (!query.trim()) {
      setItems([]);
      setOpen(false);
      return;
    }
    const ac = new AbortController();
    abortRef.current = ac;
    fetch(`/api/people/suggest?q=${encodeURIComponent(query.trim())}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setItems(d.people ?? []);
          setHi(-1);
          setOpen((d.people ?? []).length > 0);
        }
      })
      .catch(() => {});
  };

  const change = (v: string) => {
    setQ(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      if (!composing.current) fetchSuggest(v);
    }, 220);
  };

  const goPerson = (id: string) => {
    setOpen(false);
    setItems([]);
    router.push(`/person/${id}`);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hi >= 0 && items[hi]) {
      goPerson(items[hi].id);
      return;
    }
    const query = q.trim();
    setOpen(false);
    onSubmit(query);
  };

  const keydown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((v) => Math.min(v + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((v) => Math.max(v - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <form onSubmit={submit} className={`relative ${formClassName}`}>
      <div className="relative flex-1 min-w-0 flex items-center gap-2 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className={iconClassName} />
          <input
            type="text"
            value={q}
            onChange={(e) => change(e.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              fetchSuggest(e.currentTarget.value);
            }}
            onKeyDown={keydown}
            onFocus={() => {
              if (items.length > 0 && q.trim()) setOpen(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            placeholder={placeholder}
            className={inputClassName}
            autoComplete="off"
          />
          {open && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-panel border border-line rounded-xl shadow-xl overflow-hidden">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    goPerson(it.id);
                  }}
                  onMouseEnter={() => setHi(i)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition ${
                    i === hi ? "bg-xsoft" : "hover:bg-panel2"
                  }`}
                >
                  <Avatar name={it.name} avatarUrl={it.avatar_url} size={28} />
                  <span className="text-sm font-medium truncate">{it.name}</span>
                  {it.handle && (
                    <span className="text-xs text-mut truncate ml-auto shrink-0">@{it.handle}</span>
                  )}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const query = q.trim();
                  setOpen(false);
                  onSubmit(query);
                }}
                className="w-full text-left px-3 py-2 text-xs text-x border-t border-line hover:bg-panel2 transition"
              >
                「{q.trim()}」の検索結果をすべて見る
              </button>
            </div>
          )}
        </div>
        {submitButton}
      </div>
    </form>
  );
}
