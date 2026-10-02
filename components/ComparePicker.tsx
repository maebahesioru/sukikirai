"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

type P = { id: string; name: string; handle: string | null };

export default function ComparePicker({ a, b }: { a: P | null; b: P | null }) {
  const router = useRouter();

  const go = (nextA: string | null, nextB: string | null) => {
    const qs = new URLSearchParams();
    if (nextA) qs.set("a", nextA);
    if (nextB) qs.set("b", nextB);
    router.push(`/compare?${qs.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Slot
        label="1人目"
        current={a}
        onSelect={(id) => go(id, b?.id ?? null)}
        onClear={() => go(null, b?.id ?? null)}
      />
      <Slot
        label="2人目"
        current={b}
        onSelect={(id) => go(a?.id ?? null, id)}
        onClear={() => go(a?.id ?? null, null)}
      />
    </div>
  );
}

function Slot({
  label,
  current,
  onSelect,
  onClear,
}: {
  label: string;
  current: P | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<P[]>([]);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    const query = q.trim();
    if (!query) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/people/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (d.success) setResults((d.people ?? []).slice(0, 6));
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  };

  if (current) {
    return (
      <div className="bg-panel border border-line rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-mut">{label}</div>
          <div className="font-bold truncate">{current.name}</div>
          {current.handle && <div className="text-xs text-mut truncate">@{current.handle}</div>}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-mut hover:text-bad text-xs flex items-center gap-1 shrink-0 transition"
        >
          <X className="w-3.5 h-3.5" />
          解除
        </button>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-line rounded-2xl p-4">
      <div className="text-xs text-mut mb-2">{label}</div>
      <div className="flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          placeholder="名前・@IDで検索"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-line bg-panel2 text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
        />
        <button
          type="button"
          onClick={search}
          disabled={busy}
          className="px-3 rounded-xl bg-panel2 border border-line text-sm hover:border-line2 transition disabled:opacity-50"
        >
          検索
        </button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 space-y-0.5 bg-panel2 border border-line rounded-xl p-1.5">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-panel transition"
            >
              {p.name}
              {p.handle && <span className="text-mut text-xs ml-2">@{p.handle}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
