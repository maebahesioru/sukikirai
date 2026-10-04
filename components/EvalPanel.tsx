"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Star } from "lucide-react";
import { EVAL_ITEMS } from "@/lib/constants";
import type { EvalStats } from "@/lib/types";

export default function EvalPanel({
  personId,
  personName,
  initialStats,
  hasVoted,
  initialMine,
  archived = false,
}: {
  personId: string;
  personName: string;
  initialStats: EvalStats;
  hasVoted: boolean;
  initialMine: Record<string, number | null> | null;
  archived?: boolean;
}) {
  const [stats, setStats] = useState<EvalStats>(initialStats);
  const [mine, setMine] = useState<Record<string, number | null> | null>(initialMine);
  const [draft, setDraft] = useState<Record<string, number>>(
    initialMine
      ? Object.fromEntries(
          Object.entries(initialMine).filter(([, v]) => typeof v === "number") as [string, number][]
        )
      : {}
  );
  const [busy, setBusy] = useState(false);
  const [tweet, setTweet] = useState(true);

  const saved = !!mine;
  const overall = stats.overall;
  const answered = Object.keys(draft).length;

  const submit = async () => {
    if (answered === 0) {
      alert("1項目以上選んでください");
      return;
    }
    const token = Cookies.get("user_token");
    if (!token) {
      alert("評価には利用規約への同意が必要です。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, userToken: token, scores: draft }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setMine(data.mine ?? draft);
        if (tweet) {
          const ov = data.stats?.overall;
          const text = `「${personName}」の8項目評価を書き込みました！\n総合 ${ov != null ? Number(ov).toFixed(1) : "—"}/5.0\n#ツイッタラー世論調査`;
          window.open(
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`,
            "_blank"
          );
        }
      } else {
        alert(data.error || "評価の送信に失敗しました");
      }
    } catch {
      alert("評価の送信に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
      <h2 className="text-xl font-bold">8項目の評価</h2>
      <div className="flex items-center gap-3">
        <span className="text-sm text-mut">総合</span>
        <span className="text-2xl font-black text-gold">
          {overall != null ? overall.toFixed(1) : "—"}
        </span>
        <span className="text-sm text-mut">/ 5.0</span>
        <span className="text-xs text-mut">（{stats.total}人が回答）</span>
      </div>
    </div>
  );

  // スレ落ち（アーカイブ）: 平均点のみ表示・書き込み不可
  if (archived) {
    return (
      <section className="bg-panel border border-line rounded-2xl p-6">
        {header}
        <div className="space-y-3">
          {EVAL_ITEMS.map((item) => {
            const avg = stats.avgs[item.key];
            const count = stats.counts[item.key] ?? 0;
            return (
              <div key={item.key} className="flex items-center gap-3">
                <span className="w-20 sm:w-24 text-sm text-mut shrink-0">{item.label}</span>
                <span className="text-sm font-bold w-10 text-right">
                  {avg != null ? avg.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-mut">（{count}）</span>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-mut mt-4">
          ※ このページはアーカイブされたため、評価の書き込みは終了しています
        </p>
      </section>
    );
  }

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      {header}

      {!hasVoted && (
        <div className="bg-panel2 border border-line rounded-xl p-4 mb-4 text-center text-sm text-mut">
          投票すると評価を書き込めるようになります
        </div>
      )}
      {hasVoted && saved && (
        <div className="bg-panel2 border border-line rounded-xl p-3 mb-4 text-center text-sm text-mut">
          今日の評価は送信済みです（あなたの評価は●で表示）
        </div>
      )}

      <div className="space-y-3">
        {EVAL_ITEMS.map((item) => {
          const avg = stats.avgs[item.key];
          const count = stats.counts[item.key] ?? 0;
          const myVal = saved ? mine?.[item.key] ?? null : draft[item.key] ?? null;
          return (
            <div key={item.key} className="flex items-center gap-3 flex-wrap">
              <span className="w-20 sm:w-24 text-sm text-mut shrink-0">{item.label}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={!hasVoted || saved || busy}
                    onClick={() => setDraft({ ...draft, [item.key]: v })}
                    className={`p-1 transition ${
                      !hasVoted || saved ? "cursor-default" : "hover:scale-110"
                    }`}
                    aria-label={`${item.label} ${v}`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (myVal ?? 0) >= v
                          ? "text-gold fill-gold"
                          : "text-line2 fill-transparent"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-bold w-10 text-right">
                {avg != null ? avg.toFixed(1) : "—"}
              </span>
              <span className="text-xs text-mut">（{count}）</span>
            </div>
          );
        })}
      </div>

      {hasVoted && !saved && (
        <label className="flex items-center justify-center gap-2 text-sm text-mut cursor-pointer mt-5">
          <input
            type="checkbox"
            checked={tweet}
            onChange={(e) => setTweet(e.target.checked)}
            className="w-4 h-4 accent-sky-500"
          />
          Xでツイートする
        </label>
      )}
      {hasVoted && !saved && (
        <button
          onClick={submit}
          disabled={busy || answered === 0}
          className={`mt-3 w-full py-3 rounded-xl font-bold transition ${
            busy || answered === 0
              ? "bg-panel2 text-mut cursor-not-allowed"
              : "bg-x text-white hover:opacity-90"
          }`}
        >
          {busy ? "送信中..." : `この評価を送信する（${answered}/8項目）`}
        </button>
      )}
    </section>
  );
}
