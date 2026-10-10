import { PARTIES } from "@/data/election";

export type TrendRow = { day: string; hour: number; party_id: string; seats: number };

/** 党勢の推移（スナップショットの折れ線・サーバーレンダリングSVG） */
export default function ElectionTrendChart({ rows, note }: { rows: TrendRow[]; note: string }) {
  const keyOf = (r: { day: string; hour: number }) => `${r.day} ${String(r.hour).padStart(2, "0")}`;
  const keys = [...new Set(rows.map(keyOf))].sort();
  if (keys.length < 2) {
    return <p className="text-xs text-mut">{note}</p>;
  }
  const idx = new Map(keys.map((k, i) => [k, i]));
  const latest = new Map<string, number>();
  for (const r of rows) latest.set(r.party_id, r.seats);
  const top = PARTIES.slice()
    .sort((a, b) => (latest.get(b.id) ?? 0) - (latest.get(a.id) ?? 0))
    .slice(0, 5);
  const W = 720;
  const H = 240;
  const padL = 34;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const yMax = Math.max(50, ...[...latest.values()]);
  const x = (i: number) => padL + (i * (W - padL - padR)) / (keys.length - 1);
  const y = (v: number) => H - padB - (v * (H - padT - padB)) / yMax;
  const series = top.map((p) => {
    const pts: [number, number][] = [];
    for (const r of rows) {
      if (r.party_id !== p.id) continue;
      pts.push([x(idx.get(keyOf(r)) ?? 0), y(r.seats)]);
    }
    return { p, pts };
  });
  const gridVals = [0, Math.round(yMax / 2), yMax];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="党勢の推移">
        {gridVals.map((v) => (
          <g key={v}>
            <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
            <text x={padL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.55">
              {v}
            </text>
          </g>
        ))}
        {series.map(({ p, pts }) => (
          <g key={p.id}>
            <polyline
              points={pts.map(([a, b]) => `${a},${b}`).join(" ")}
              fill="none"
              stroke={p.color}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.length > 0 && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3.5" fill={p.color} />}
          </g>
        ))}
        <text x={padL} y={H - 6} fontSize="11" fill="currentColor" fillOpacity="0.55">
          {keys[0]}
        </text>
        <text x={W - padR} y={H - 6} textAnchor="end" fontSize="11" fill="currentColor" fillOpacity="0.55">
          {keys[keys.length - 1]}
        </text>
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {series.map(({ p }) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 text-xs text-mut">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            {p.name} <b>{latest.get(p.id) ?? 0}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
