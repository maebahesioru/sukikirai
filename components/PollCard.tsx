import Link from "next/link";
import { MessageCircle } from "lucide-react";
import Avatar from "@/components/Avatar";
import { findOptionPerson, type PollPersonLite } from "@/lib/pollui";
import type { Poll, PollOption } from "@/lib/types";
import { formatJST } from "@/lib/format";

export default function PollCard({
  poll,
  related = [],
}: {
  poll: Poll & { options: PollOption[]; comment_count: number };
  related?: PollPersonLite[];
}) {
  const total = poll.options.reduce((a, o) => a + Number(o.vote_count), 0);
  return (
    <Link
      href={`/polls/${poll.id}`}
      className="block bg-panel border border-line rounded-2xl p-5 hover:border-line2 transition"
    >
      <h2 className="font-bold leading-snug">{poll.title}</h2>
      {poll.description && (
        <p className="text-sm text-mut mt-1 line-clamp-2">{poll.description}</p>
      )}

      <div className="mt-3 space-y-1.5">
        {poll.options.slice(0, 4).map((o) => {
          const count = Number(o.vote_count);
          const pct = total > 0 ? (count / total) * 100 : 0;
          const person = findOptionPerson(o.option_text, related);
          // 一覧は18px表示なので48px版のまま（400x400版は重い）
          const avatar = person?.avatar_url ?? null;
          return (
            <div key={o.id}>
              <div className="flex items-center gap-2 text-xs mb-0.5">
                {!o.image_url && avatar && (
                  <Avatar name={person?.name ?? o.option_text} avatarUrl={avatar} size={18} />
                )}
                <span className="truncate mr-2">{o.option_text}</span>
                <span className="text-mut shrink-0 ml-auto">
                  {count}票（{pct.toFixed(0)}%）
                </span>
              </div>
              <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                <div className="bg-x h-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
        {poll.options.length > 4 && (
          <p className="text-xs text-mut">ほか {poll.options.length - 4} 個の選択肢</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-mut mt-3">
        <span>{total}票</span>
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          {poll.comment_count}
        </span>
        <span>{formatJST(poll.created_at, "yyyy/MM/dd")}</span>
      </div>
    </Link>
  );
}
