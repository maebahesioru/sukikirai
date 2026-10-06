import Link from "next/link";
import { Flame, MessageCircle } from "lucide-react";
import Avatar from "./Avatar";
import EmojiText from "./EmojiText";
import { timeAgo } from "@/lib/format";
import type { RankingRow } from "@/lib/types";
import { getServerT, getLocale } from "@/lib/i18n-server";

export default async function Sidebar({
  trending,
  recentComments,
}: {
  trending: RankingRow[];
  recentComments: {
    id: string;
    person_id: string;
    person_name: string;
    content: string;
    vote_type: string;
    created_at: string;
  }[];
}) {
  const t = await getServerT();
  const locale = await getLocale();
  return (
    <aside className="space-y-4">
      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-4 h-4 text-like" />
          <h2 className="font-bold">{t("今週の急上昇")}</h2>
        </div>
        <div className="space-y-1.5">
          {trending.slice(0, 8).map((p, i) => (
            <Link
              key={p.id}
              href={`/person/${p.id}`}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-panel2 transition"
            >
              <span
                className={`w-6 text-center text-sm font-black shrink-0 ${
                  i === 0 ? "text-gold" : i === 1 ? "text-mut" : i === 2 ? "text-amber-600" : "text-mut/60"
                }`}
              >
                {i + 1}
              </span>
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={32} />
              <span className="text-sm truncate flex-1"><EmojiText text={p.name} /></span>
              <span className="text-xs font-bold text-x shrink-0">{t("{n}票", { n: p.recentVotes ?? 0 })}</span>
            </Link>
          ))}
          {trending.length === 0 && <p className="text-sm text-mut">{t("まだデータがありません")}</p>}
        </div>
        <Link
          href="/ranking/trending"
          className="block text-center text-xs text-x hover:underline mt-3"
        >
          {t("トレンドランキングをもっと見る")}
        </Link>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-4 h-4 text-x" />
          <h2 className="font-bold">{t("新着コメント")}</h2>
        </div>
        <div className="space-y-3">
          {recentComments.map((c) => (
            <div key={c.id} className="text-sm border-b border-line last:border-0 pb-3 last:pb-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Link
                  href={`/person/${c.person_id}`}
                  className="font-bold text-x hover:underline truncate"
                >
                  {c.person_name}
                </Link>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    c.vote_type === "like" ? "bg-likesoft text-like" : "bg-dislikesoft text-dislike"
                  }`}
                >
                  {c.vote_type === "like" ? t("好き派") : t("嫌い派")}
                </span>
                <span className="text-[10px] text-mut shrink-0">{timeAgo(c.created_at, locale)}</span>
              </div>
              <p className="text-mut line-clamp-5 leading-snug">{c.content}</p>
            </div>
          ))}
          {recentComments.length === 0 && <p className="text-sm text-mut">{t("まだコメントがありません")}</p>}
        </div>
      </div>
    </aside>
  );
}
