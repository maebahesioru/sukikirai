import type { Metadata } from "next";
import Link from "next/link";
import { getEvalStats, getPerson, getVoteStats } from "@/lib/queries";
import type { EvalStats, Person, VoteStats } from "@/lib/types";
import { EVAL_ITEMS } from "@/lib/constants";
import Avatar from "@/components/Avatar";
import ComparePicker from "@/components/ComparePicker";
import { num } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ a?: string; b?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const [a, b] = await Promise.all([
    sp.a ? getPerson(sp.a) : null,
    sp.b ? getPerson(sp.b) : null,
  ]);
  const title = a && b ? `${a.name} vs ${b.name} 比較` : "ツイッタラー比較";
  const description =
    a && b
      ? `${a.name} と ${b.name} の好き嫌い率・8項目評価・票数を並べて比較。`
      : "2人のXユーザー（ツイッタラー）を並べて比較できるページです。";
  return { title, description, robots: { index: false } };
}

function overallOf(e: EvalStats): number | null {
  const vals = EVAL_ITEMS.map((i) => e.avgs[i.key]).filter(
    (v): v is number => typeof v === "number"
  );
  return vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
}

export default async function ComparePage({ searchParams }: Props) {
  const sp = await searchParams;
  const baseA = sp.a ? await getPerson(sp.a) : null;
  const baseB = sp.b ? await getPerson(sp.b) : null;
  const pa = baseA && !baseA.is_hidden ? baseA : null;
  const pb = baseB && !baseB.is_hidden ? baseB : null;

  let va: VoteStats | null = null;
  let vb: VoteStats | null = null;
  let ea: EvalStats | null = null;
  let eb: EvalStats | null = null;
  if (pa && pb) {
    [va, vb, ea, eb] = await Promise.all([
      getVoteStats(pa.id),
      getVoteStats(pb.id),
      getEvalStats(pa.id),
      getEvalStats(pb.id),
    ]);
  }

  return (
    <div className="space-y-5">
      <section className="bg-panel border border-line rounded-2xl p-5">
        <h1 className="text-xl font-black">ツイッタラー比較</h1>
        <p className="text-sm text-mut mt-1">
          2人の好き嫌い率と8項目評価を並べて比較できます。
        </p>
        <div className="mt-4">
          <ComparePicker
            a={pa ? { id: pa.id, name: pa.name, handle: pa.handle } : null}
            b={pb ? { id: pb.id, name: pb.name, handle: pb.handle } : null}
          />
        </div>
      </section>

      {!pa || !pb || !va || !vb || !ea || !eb ? (
        <p className="text-sm text-mut px-1">
          {!pa && !pb ? "2人を選んでください。" : "もう1人選ぶと比較が表示されます。"}
        </p>
      ) : (
        <>
          {/* ヘッダー */}
          <section className="grid grid-cols-2 gap-3">
            {[
              { p: pa, v: va },
              { p: pb, v: vb },
            ].map(({ p, v }) => (
              <div key={p.id} className="bg-panel border border-line rounded-2xl p-4 text-center">
                <div className="flex justify-center mb-2">
                  <Avatar name={p.name} avatarUrl={p.avatar_url} size={56} />
                </div>
                <Link href={`/person/${p.id}`} className="font-bold hover:text-x transition block truncate">
                  {p.name}
                </Link>
                {p.handle && <div className="text-xs text-mut truncate">@{p.handle}</div>}
                <div className="text-xs text-mut mt-1">
                  {p.category !== "その他" ? p.category : ""}
                  {p.followers ? ` ・ ${num(p.followers)}フォロワー` : ""}
                </div>
                <div className="text-xs text-mut mt-1">
                  {v.total}票 ・ 評価 {ea && eb ? (p === pa ? ea.total : eb.total) : 0}人
                </div>
              </div>
            ))}
          </section>

          {/* 好き率 */}
          <section className="bg-panel border border-line rounded-2xl p-5">
            <h2 className="font-bold mb-4">好き / 嫌い</h2>
            <div className="space-y-4">
              {[
                { p: pa, v: va },
                { p: pb, v: vb },
              ].map(({ p, v }) => (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium truncate mr-2">{p.name}</span>
                    <span className="text-mut shrink-0">{v.total}票</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-like font-bold text-sm w-14 text-right shrink-0">
                      {v.total > 0 ? `${Math.round(v.likePct)}%` : "—"}
                    </span>
                    <div className="flex-1 h-3 bg-line rounded-full overflow-hidden flex">
                      <div className="bg-like h-full" style={{ width: `${v.likePct}%` }} />
                      <div className="bg-dislike h-full" style={{ width: `${100 - v.likePct}%` }} />
                    </div>
                    <span className="text-dislike font-bold text-sm w-14 shrink-0">
                      {v.total > 0 ? `${Math.round(100 - v.likePct)}%` : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 総合評価 */}
          <section className="bg-panel border border-line rounded-2xl p-5">
            <h2 className="font-bold mb-4">総合評価（8項目の平均）</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              {[
                { p: pa, e: ea },
                { p: pb, e: eb },
              ].map(({ p, e }) => {
                const o = overallOf(e);
                return (
                  <div key={p.id}>
                    <div className="text-3xl font-black text-gold">
                      {o != null ? o.toFixed(1) : "—"}
                    </div>
                    <div className="text-xs text-mut truncate mt-1">{p.name}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 8項目 */}
          <section className="bg-panel border border-line rounded-2xl p-5">
            <h2 className="font-bold mb-4">8項目の比較</h2>
            <div className="space-y-3">
              {EVAL_ITEMS.map((item) => {
                const av = ea.avgs[item.key];
                const bv = eb.avgs[item.key];
                const aWin = av != null && bv != null && av > bv;
                const bWin = av != null && bv != null && bv > av;
                return (
                  <div key={item.key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="flex items-center gap-2 justify-end">
                      <span className={`text-sm font-bold ${aWin ? "text-x" : ""}`}>
                        {av != null ? av.toFixed(2) : "—"}
                      </span>
                      <div className="w-24 h-2 bg-line rounded-full overflow-hidden">
                        <div
                          className={`h-full ${aWin ? "bg-x" : "bg-mut/50"}`}
                          style={{ width: `${((av ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-mut w-20 text-center shrink-0">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-line rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bWin ? "bg-x" : "bg-mut/50"}`}
                          style={{ width: `${((bv ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${bWin ? "text-x" : ""}`}>
                        {bv != null ? bv.toFixed(2) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
