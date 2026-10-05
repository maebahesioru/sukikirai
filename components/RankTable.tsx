import Link from "next/link";
import Avatar from "./Avatar";
import type { RankingRow } from "@/lib/types";
import { getServerT } from "@/lib/i18n-server";

export type RankKind = "popularity" | "unpopular" | "trending" | "daily" | "score" | "lowscore";

export default async function RankTable({ rows, kind }: { rows: RankingRow[]; kind: RankKind }) {
  const t = await getServerT();
  return (
    <div className="space-y-2">
      {rows.map((p, i) => {
        const rank = i + 1;
        let metric: React.ReactNode;
        if (kind === "trending" || kind === "daily") {
          metric = <span className="text-sm font-bold text-x">{t("{n}票", { n: p.recentVotes ?? 0 })}</span>;
        } else if (kind === "score" || kind === "lowscore") {
          metric = (
            <span className={`text-sm font-bold ${kind === "score" ? "text-gold" : "text-bad"}`}>
              {p.overall != null ? p.overall.toFixed(2) : "—"}
              <span className="text-xs text-mut ml-1">{t("（{n}人）", { n: p.evalCount ?? 0 })}</span>
            </span>
          );
        } else {
          const pct = kind === "popularity" ? p.likePct : 100 - p.likePct;
          metric = (
            <div className="flex items-center gap-2 min-w-44">
              <span
                className={`text-sm font-bold w-14 text-right ${
                  kind === "popularity" ? "text-like" : "text-dislike"
                }`}
              >
                {pct.toFixed(1)}%
              </span>
              <div className="flex-1 bg-line rounded-full h-2 overflow-hidden flex">
                <div className="bg-like h-full" style={{ width: `${p.likePct}%` }} />
                <div className="bg-dislike h-full" style={{ width: `${100 - p.likePct}%` }} />
              </div>
              <span className="text-xs text-mut w-14 text-right">{t("{n}票", { n: p.total })}</span>
            </div>
          );
        }

        return (
          <Link
            key={p.id}
            href={`/person/${p.id}`}
            className="flex items-center gap-3 bg-panel border border-line rounded-xl px-4 py-3 hover:border-line2 transition"
          >
            <span
              className={`w-8 text-center font-black shrink-0 ${
                rank === 1
                  ? "text-gold text-xl"
                  : rank === 2
                  ? "text-slate-300 text-lg"
                  : rank === 3
                  ? "text-amber-600 text-lg"
                  : "text-mut"
              }`}
            >
              {rank}
            </span>
            <Avatar name={p.name} avatarUrl={p.avatar_url} size={40} />
            <div className="min-w-0 flex-1">
              <p className="font-bold truncate">{p.name}</p>
              {p.handle && <p className="text-xs text-mut truncate">@{p.handle}</p>}
            </div>
            <div className="shrink-0">{metric}</div>
          </Link>
        );
      })}
      {rows.length === 0 && (
        <p className="text-center text-mut py-10">{t("まだデータがありません")}</p>
      )}
    </div>
  );
}
