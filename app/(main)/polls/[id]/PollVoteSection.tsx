"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Plus } from "lucide-react";
import type { PollOption, PollType } from "@/lib/types";

export default function PollVoteSection({
  pollId,
  pollType,
  options: initialOptions,
  initialVoteOptionId,
}: {
  pollId: string;
  pollType: PollType;
  options: PollOption[];
  initialVoteOptionId: string | null;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [myChoice, setMyChoice] = useState<string | null>(initialVoteOptionId);
  const [busy, setBusy] = useState(false);
  const [addText, setAddText] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const total = options.reduce((a, o) => a + Number(o.vote_count), 0);

  const vote = async (optionId: string) => {
    if (myChoice || busy) return;
    const token = Cookies.get("user_token");
    if (!token) {
      alert("投票には利用規約への同意が必要です。ページを再読み込みしてください。");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionId, userToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.options) setOptions(data.options);
        setMyChoice(optionId);
      } else if (res.status === 429 && data.currentOptionId) {
        if (data.options) setOptions(data.options);
        setMyChoice(data.currentOptionId);
        alert("既に投票済みです");
      } else {
        alert(data.error || "投票に失敗しました");
      }
    } catch {
      alert("投票に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const addOption = async () => {
    const text = addText.trim();
    if (!text) return;
    const token = Cookies.get("user_token");
    if (!token) {
      alert("選択肢の追加には利用規約への同意が必要です");
      return;
    }
    setAddBusy(true);
    try {
      const res = await fetch("/api/polls/add-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionText: text, userToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        setOptions([...options, data.option]);
        setAddText("");
      } else {
        alert(data.error || "追加に失敗しました");
      }
    } catch {
      alert("追加に失敗しました");
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <h2 className="font-bold mb-4">{myChoice ? "投票結果" : "あなたの一票を投じよう"}</h2>

      <div className="space-y-2">
        {options.map((o) => {
          const count = Number(o.vote_count);
          const pct = total > 0 ? (count / total) * 100 : 0;
          const isMine = myChoice === o.id;
          if (!myChoice) {
            return (
              <button
                key={o.id}
                onClick={() => vote(o.id)}
                disabled={busy}
                className="w-full text-left px-4 py-3 rounded-xl border border-line bg-panel2 hover:border-x hover:bg-xsoft transition font-medium text-sm disabled:opacity-60"
              >
                {o.option_text}
              </button>
            );
          }
          return (
            <div
              key={o.id}
              className={`px-4 py-3 rounded-xl border ${
                isMine ? "border-x bg-xsoft" : "border-line bg-panel2"
              }`}
            >
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium">
                  {o.option_text}
                  {isMine && <span className="text-x text-xs ml-2">← あなたの投票</span>}
                </span>
                <span className="text-mut shrink-0 ml-3">
                  {count}票（{pct.toFixed(1)}%）
                </span>
              </div>
              <div className="w-full bg-panel rounded-full h-2 overflow-hidden">
                <div className="bg-x h-full bar-anim" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {pollType === "three_plus_open" && (
        <div className="mt-5 pt-4 border-t border-line">
          <p className="text-sm font-bold mb-2">選択肢を追加する</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value.slice(0, 100))}
              placeholder="新しい選択肢"
              className="flex-1 px-3 py-2 rounded-xl border border-line text-sm focus:outline-none focus:ring-2 focus:ring-x/60"
            />
            <button
              onClick={addOption}
              disabled={addBusy || !addText.trim()}
              className={`px-4 rounded-xl text-sm font-bold transition flex items-center gap-1 ${
                addBusy || !addText.trim()
                  ? "bg-panel2 text-mut cursor-not-allowed"
                  : "bg-good text-white hover:opacity-90"
              }`}
            >
              <Plus className="w-4 h-4" />
              追加
            </button>
          </div>
          <p className="text-xs text-mut mt-1.5">※ 追加できるのは投稿者以外・1人3個まで・全体で20個まで</p>
        </div>
      )}
    </section>
  );
}
