import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { checkPollVote, getPeopleByIds, getPoll } from "@/lib/queries";
import { formatJST } from "@/lib/format";
import PollVoteSection from "./PollVoteSection";
import PollComments from "./PollComments";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "投票トーク" };
  const poll = await getPoll(id);
  return {
    title: poll ? poll.title : "投票トーク",
    description: poll?.description ?? undefined,
    alternates: { canonical: `/polls/${id}` },
    openGraph: {
      title: poll ? poll.title : "投票トーク",
      description: poll?.description ?? undefined,
      images: ["/og.png"],
    },
  };
}

export default async function PollPage({ params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const poll = await getPoll(id);
  if (!poll) notFound();

  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value ?? "";
  const [myVote, related] = await Promise.all([
    checkPollVote(id, token),
    getPeopleByIds(poll.related_person_ids),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-goodsoft text-good">
            投票トーク
          </span>
        </div>
        <h1 className="text-2xl font-black leading-snug">{poll.title}</h1>
        {poll.description && (
          <p className="text-sm text-mut mt-2 leading-relaxed whitespace-pre-wrap">{poll.description}</p>
        )}
        <p className="text-xs text-mut mt-3">
          {formatJST(poll.created_at)} 作成 ・ {poll.total_votes}票
        </p>
        {related.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-mut self-center">関連:</span>
            {related.map((p) => (
              <Link
                key={p.id}
                href={`/person/${p.id}`}
                className="text-xs px-2.5 py-1 rounded-full bg-panel2 border border-line hover:border-line2 transition whitespace-nowrap"
              >
                {p.name}
              </Link>
            ))}
          </div>
        )}
      </section>

      <PollVoteSection
        pollId={poll.id}
        pollType={poll.poll_type}
        options={poll.options}
        initialVoteOptionId={myVote.optionId}
        related={related.map((p) => ({ id: p.id, name: p.name, avatar_url: p.avatar_url }))}
      />

      <PollComments pollId={poll.id} />

      <p className="text-center text-xs text-mut">
        投票は1人1回まで（変更できません） ・ コメントは誰でも書き込めます
      </p>
    </div>
  );
}
