"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PARTIES } from "@/data/election";
import { useT } from "@/lib/i18n-client";

type MapData = { viewBox: string; districts: { id: string; pref: string; d: string }[] };
export type DistrictResult = { id: string; color: string; label: string };

/** 日本地図（289小選挙区・当選党色分け・ズーム/パン対応）— 2026-10-10
 * 2026-10-11: モバイル対応 — 2本指ピンチズーム実装・増分パン・pointercancel対応・iOS callout抑制
 * 境界データ: /election-map.json（地域・交通データ研究所 パブリックドメインを加工） */
export default function JapanElectionMap({ results }: { results: DistrictResult[] }) {
  const [data, setData] = useState<MapData | null>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  // 単指/マウスパン: sx,sy=開始点 px,py=前回点（増分移動で計算）
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number; moved: boolean } | null>(null);
  // 2本指ピンチ: d=開始時の指間距離 s=開始時のスケール
  const pinchRef = useRef<{ d: number; s: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const router = useRouter();
  const t = useT();

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

  // ホイールズーム（カーソル位置基準・デスクトップ）
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
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragRef.current = { sx: e.clientX, sy: e.clientY, px: e.clientX, py: e.clientY, moved: false };
      pinchRef.current = null;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { d: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), s: view.s };
      if (dragRef.current) dragRef.current.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !svgRef.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const rect = svgRef.current.getBoundingClientRect();
    const [, , w, h] = vb();

    if (pointers.current.size >= 2 && pinchRef.current) {
      // ピンチズーム: 2本指の中点基準。中点が動けばパンも同時に効く
      const [a, b] = [...pointers.current.values()];
      const d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const p = pinchRef.current;
      const cx = (((a.x + b.x) / 2 - rect.left) / rect.width) * w;
      const cy = (((a.y + b.y) / 2 - rect.top) / rect.height) * h;
      setView((v) => {
        const ns = Math.min(16, Math.max(1, p.s * (d / p.d)));
        if (ns === 1) return { s: 1, x: 0, y: 0 };
        const k = ns / v.s;
        return { s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
      return;
    }

    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 5) d.moved = true;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    d.px = e.clientX;
    d.py = e.clientY;
    if (d.moved) {
      setView((v) => ({ ...v, x: v.x + (dx / rect.width) * w, y: v.y + (dy / rect.height) * h }));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 1) {
      // ピンチ→単指に戻ったら、残った指でパンを続けられるよう基準を取り直す
      const [a] = [...pointers.current.values()];
      dragRef.current = { sx: a.x, sy: a.y, px: a.x, py: a.y, moved: true };
      pinchRef.current = null;
    } else if (pointers.current.size === 0) {
      pinchRef.current = null;
      window.setTimeout(() => {
        dragRef.current = null;
      }, 0);
    }
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
          className="w-10 h-10 rounded-lg bg-panel border border-line text-base font-bold hover:border-line2 transition"
          aria-label={t("拡大")}
        >
          ＋
        </button>
        <button
          onClick={() => zoomAtCenter(1 / 1.5)}
          className="w-10 h-10 rounded-lg bg-panel border border-line text-base font-bold hover:border-line2 transition"
          aria-label={t("縮小")}
        >
          －
        </button>
        <button
          onClick={() => setView({ s: 1, x: 0, y: 0 })}
          className="w-10 h-10 rounded-lg bg-panel border border-line text-sm hover:border-line2 transition"
          aria-label={t("リセット")}
        >
          ⟲
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className="w-full block touch-none cursor-grab active:cursor-grabbing"
        style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
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
                stroke="#0f172a"
                strokeWidth={1.1 / view.s}
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
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
        {PARTIES.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 text-xs text-mut">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
        ))}
      </div>
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
        {t("ドラッグで移動・ピンチ/＋－でズーム・タップで選挙区ページへ ｜ 色 = 当選党")}
      </p>
      <p className="text-center text-[10px] text-mut/60 mt-1">
        {t("地図データ: 地域・交通データ研究所（パブリックドメイン）を加工")}
      </p>
    </div>
  );
}
