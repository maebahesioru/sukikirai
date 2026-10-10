"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MapData = { viewBox: string; districts: { id: string; pref: string; d: string }[] };
export type DistrictResult = { id: string; color: string; label: string };

/** 日本地図（289小選挙区・当選党色分け・ズーム/パン対応）— 2026-10-10
 * 境界データ: /election-map.json（地域・交通データ研究所 パブリックドメインを加工） */
export default function JapanElectionMap({ results }: { results: DistrictResult[] }) {
  const [data, setData] = useState<MapData | null>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const router = useRouter();

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

  const vb = (): [number, number, number, number] =>
    (data?.viewBox.split(" ").map(Number) as [number, number, number, number]) ?? [0, 0, 1000, 1134];

  // ホイールズーム（カーソル位置基準）
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !data) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const [, , w, h] = vb();
      const cx = ((e.clientX - rect.left) / rect.width) * w;
      const cy = ((e.clientY - rect.top) / rect.height) * h;
      setView((v) => {
        const f = e.deltaY < 0 ? 1.25 : 1 / 1.25;
        const ns = Math.min(16, Math.max(1, v.s * f));
        if (ns === 1) return { s: 1, x: 0, y: 0 };
        const k = ns / v.s;
        return { s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const zoomAtCenter = (f: number) => {
    const [, , w, h] = vb();
    setView((v) => {
      const ns = Math.min(16, Math.max(1, v.s * f));
      if (ns === 1) return { s: 1, x: 0, y: 0 };
      const k = ns / v.s;
      const cx = w / 2;
      const cy = h / 2;
      return { s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || !svgRef.current) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    if (d.moved) {
      const rect = svgRef.current.getBoundingClientRect();
      const [, , w, h] = vb();
      setView((v) => ({ ...v, x: d.x + (dx / rect.width) * w, y: d.y + (dy / rect.height) * h }));
    }
  };
  const onPointerUp = () => {
    window.setTimeout(() => {
      dragRef.current = null;
    }, 0);
  };

  if (!data) {
    return <div className="h-80 rounded-xl bg-panel2 animate-pulse" />;
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  const [, , w, h] = vb();

  return (
    <div ref={wrapRef} className="relative select-none">
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => zoomAtCenter(1.5)}
          className="w-8 h-8 rounded-lg bg-panel border border-line text-sm font-bold hover:border-line2 transition"
          aria-label="拡大"
        >
          ＋
        </button>
        <button
          onClick={() => zoomAtCenter(1 / 1.5)}
          className="w-8 h-8 rounded-lg bg-panel border border-line text-sm font-bold hover:border-line2 transition"
          aria-label="縮小"
        >
          －
        </button>
        <button
          onClick={() => setView({ s: 1, x: 0, y: 0 })}
          className="w-8 h-8 rounded-lg bg-panel border border-line text-xs hover:border-line2 transition"
          aria-label="リセット"
        >
          ⟲
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full block touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label="日本地図（289小選挙区・当選党色分け）"
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.s})`}>
          {data.districts.map((d) => {
            const r = byId.get(d.id);
            return (
              <path
                key={d.id}
                d={d.d}
                fill={r?.color ?? "#475569"}
                stroke="#0b1220"
                strokeWidth={0.4 / view.s}
                opacity={0.92}
                onMouseMove={(e) => {
                  const wrap = wrapRef.current?.getBoundingClientRect();
                  if (!wrap) return;
                  setTip({ x: e.clientX - wrap.left, y: e.clientY - wrap.top, text: `${d.id}｜${r?.label ?? ""}` });
                }}
                onMouseLeave={() => setTip(null)}
                onClick={() => {
                  if (!dragRef.current?.moved) {
                    router.push(`/election/district/${encodeURIComponent(d.id)}`);
                  }
                }}
              />
            );
          })}
        </g>
      </svg>
      {tip && (
        <div
          className="absolute z-20 pointer-events-none bg-ink border border-line rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg"
          style={{
            left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 400) - 220),
            top: tip.y + 14,
          }}
        >
          {tip.text}
        </div>
      )}
      <p className="text-center text-xs text-mut mt-2">
        ホイール/＋－でズーム・ドラッグで移動・クリックで選挙区ページへ ｜ 色 = 当選党
      </p>
      <p className="text-center text-[10px] text-mut/60 mt-1">
        地図データ: 地域・交通データ研究所（パブリックドメイン）を加工
      </p>
    </div>
  );
}
