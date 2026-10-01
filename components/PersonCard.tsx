import Link from "next/link";
import Avatar from "./Avatar";
import type { Person } from "@/lib/types";

export type PersonCardData = Person & { likes?: number; dislikes?: number; total?: number };

export default function PersonCard({ p }: { p: PersonCardData }) {
  const total = p.total ?? 0;
  const likePct = total > 0 ? ((p.likes ?? 0) / total) * 100 : null;

  return (
    <Link
      href={`/person/${p.id}`}
      className="bg-panel border border-line rounded-2xl p-4 hover:border-line2 transition group flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <Avatar name={p.name} avatarUrl={p.avatar_url} size={44} />
        <div className="min-w-0">
          <h3 className="font-bold truncate group-hover:text-x transition">{p.name}</h3>
          {p.handle && <p className="text-xs text-mut truncate">@{p.handle}</p>}
        </div>
      </div>

      {p.description && (
        <p className="text-sm text-mut line-clamp-2 leading-snug">{p.description}</p>
      )}

      <div className="flex flex-wrap gap-1 mt-auto">
        {p.category && p.category !== "その他" && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-xsoft text-x">{p.category}</span>
        )}
        {p.tags.slice(0, 3).map((t) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-panel2 text-mut border border-line">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-1">
        {likePct != null ? (
          <>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-like font-bold">好き {likePct.toFixed(0)}%</span>
              <span className="text-mut">{total}票</span>
            </div>
            <div className="w-full bg-line rounded-full h-1.5 overflow-hidden flex">
              <div className="bg-like h-full" style={{ width: `${likePct}%` }} />
              <div className="bg-dislike h-full" style={{ width: `${100 - likePct}%` }} />
            </div>
          </>
        ) : (
          <p className="text-xs text-mut">まだ投票がありません</p>
        )}
      </div>
    </Link>
  );
}
