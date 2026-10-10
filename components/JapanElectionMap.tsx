"use client";

import { useEffect, useState } from "react";

type MapData = { viewBox: string; prefs: { ken: number; name: string; d: string }[] };

export type PrefResult = { name: string; color: string; label: string };

/** 日本地図（47都道府県・最多当選の党で色分け）— 2026-10-10
 * 境界データは起動時のみ /election-map.json をfetch（バンドルに入れない） */
export default function JapanElectionMap({ results }: { results: PrefResult[] }) {
  const [data, setData] = useState<MapData | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/election-map.json")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return <div className="h-72 rounded-xl bg-panel2 animate-pulse" />;
  }
  const byName = new Map(results.map((r) => [r.name, r]));
  return (
    <div>
      <svg viewBox={data.viewBox} className="w-full max-w-[520px] mx-auto block" role="img" aria-label="日本地図（当選党の色分け）">
        {data.prefs.map((p) => {
          const r = byName.get(p.name);
          return (
            <path key={p.ken} d={p.d} fill={r?.color ?? "#475569"} stroke="none" opacity={0.92}>
              <title>{r ? `${p.name} — ${r.label}` : p.name}</title>
            </path>
          );
        })}
      </svg>
      <p className="text-center text-xs text-mut mt-2">
        色 = その県で最多当選した党 ｜ ホバーで内訳（例: 自由党 8/12区）
      </p>
    </div>
  );
}
