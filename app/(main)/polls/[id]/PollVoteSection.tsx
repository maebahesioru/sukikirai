"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { Crown, Plus } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import Avatar from "@/components/Avatar";
import { getFingerprint } from "@/lib/fingerprint";
import { bigAvatarUrl, findOptionPerson, type PollPersonLite } from "@/lib/pollui";
import { useT } from "@/lib/i18n-client";
import type { PollOption, PollType } from "@/lib/types";

/** 選択肢のビジュアル: アップロード画像があればそれ、なければ関連人物のアイコン */
function OptionVisual({
  imageUrl,
  avatarUrl,
  name,
  size = 112,
}: {
  imageUrl: string | null;
  avatarUrl: string | null;
  name: string;
  size?: number;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full max-h-72 object-cover rounded-lg border border-line bg-panel2"
      />
    );
  }
  if (!avatarUrl) return null;
  return <Avatar name={name} avatarUrl={avatarUrl} size={size} />;
}

export default function PollVoteSection({
  pollId,
  pollType,
  options: initialOptions,
  initialVoteOptionId,
  related = [],
}: {
  pollId: string;
  pollType: PollType;
  options: PollOption[];
  initialVoteOptionId: string | null;
  related?: PollPersonLite[];
}) {
  const t = useT();
  const [options, setOptions] = useState(initialOptions);
  const [myChoice, setMyChoice] = useState<string | null>(initialVoteOptionId);
  const [busy, setBusy] = useState(false);
  const [addText, setAddText] = useState("");
  const [addImage, setAddImage] = useState("");
  const [addBusy, setAddBusy] = useState(false);

  const total = options.reduce((a, o) => a + Number(o.vote_count), 0);
  const maxCount = options.reduce((m, o) => Math.max(m, Number(o.vote_count)), 0);

  // 選択肢テキスト＝関連人物名が一致したらアイコンを自動表示（画像未設定でも地味にならない）
  const personOf = (o: PollOption) => findOptionPerson(o.option_text, related);
  const avatarOf = (o: PollOption) => bigAvatarUrl(personOf(o)?.avatar_url);
  const hasVisual = (o: PollOption) => !!o.image_url || !!avatarOf(o);

  // 2択かつ両方に画像/アイコンがある → 「どっち？」の横並びレイアウト
  const duel = pollType === "two_choice" && options.length === 2 && options.every(hasVisual);
  // 結果は票数順（tuber-review風の順位表示）
  const ranked = [...options].sort((a, b) => Number(b.vote_count) - Number(a.vote_count));

  const vote = async (optionId: string) => {
    if (myChoice || busy) return;
    const token = Cookies.get("user_token");
    if (!token) {
      alert(t("投票には利用規約への同意が必要です。ページを再読み込みしてください。"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId, optionId, userToken: token, fp: await getFingerprint() }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.options) setOptions(data.options);
        setMyChoice(optionId);
      } else if (res.status === 429 && data.currentOptionId) {
        if (data.options) setOptions(data.options);
        setMyChoice(data.currentOptionId);
        alert(t("既に投票済みです"));
      } else {
        alert(data.error || t("投票に失敗しました"));
      }
    } catch {
      alert(t("投票に失敗しました"));
    } finally {
      setBusy(false);
    }
  };

  const addOption = async () => {
    const text = addText.trim();
    if (!text) return;
    const token = Cookies.get("user_token");
    if (!token) {
      alert(t("選択肢の追加には利用規約への同意が必要です"));
      return;
    }
    setAddBusy(true);
    try {
      const res = await fetch("/api/polls/add-option", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId,
          optionText: text,
          imageUrl: addImage.trim() || null,
          userToken: token,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setOptions([...options, data.option]);
        setAddText("");
        setAddImage("");
      } else {
        alert(data.error || t("追加に失敗しました"));
      }
    } catch {
      alert(t("追加に失敗しました"));
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-6">
      <h2 className="font-bold mb-4">{myChoice ? t("投票結果") : t("あなたの一票を投じよう")}</h2>

      {!myChoice ? (
        <div className={duel ? "grid grid-cols-2 gap-3" : "space-y-2"}>
          {options.map((o) =>
            duel ? (
              <button
                key={o.id}
                onClick={() => vote(o.id)}
                disabled={busy}
                className="flex flex-col items-center justify-center gap-3 px-4 py-6 rounded-2xl border border-line bg-panel2 hover:border-x hover:bg-xsoft transition disabled:opacity-60"
              >
                <OptionVisual
                  imageUrl={o.image_url}
                  avatarUrl={avatarOf(o)}
                  name={personOf(o)?.name ?? o.option_text}
                />
                <span className="font-bold text-sm text-center leading-snug">{o.option_text}</span>
                <span className="text-[11px] text-mut">{t("タップして投票")}</span>
              </button>
            ) : (
              <button
                key={o.id}
                onClick={() => vote(o.id)}
                disabled={busy}
                className="w-full text-left px-4 py-3 rounded-xl border border-line bg-panel2 hover:border-x hover:bg-xsoft transition font-medium text-sm disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  {!o.image_url && avatarOf(o) && (
                    <Avatar
                      name={personOf(o)?.name ?? o.option_text}
                      avatarUrl={avatarOf(o)}
                      size={40}
                    />
                  )}
                  <span className="flex-1">{o.option_text}</span>
                </span>
                {o.image_url && (
                  <span className="block mt-2">
                    <OptionVisual imageUrl={o.image_url} avatarUrl={null} name={o.option_text} />
                  </span>
                )}
              </button>
            )
          )}
        </div>
      ) : (
        <div className={duel ? "grid grid-cols-2 gap-3" : "space-y-2"}>
          {(duel ? options : ranked).map((o, i) => {
            const count = Number(o.vote_count);
            const pct = total > 0 ? (count / total) * 100 : 0;
            const isMine = myChoice === o.id;
            const isTop = maxCount > 0 && count === maxCount;
            const crown = isTop ? (
              <span className="absolute -top-2.5 right-3 z-10 flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black shadow">
                <Crown className="w-3 h-3" />
              </span>
            ) : null;
            if (duel) {
              return (
                <div
                  key={o.id}
                  className={`relative flex flex-col items-center gap-3 px-4 py-5 rounded-2xl border ${
                    isMine ? "border-x bg-xsoft" : "border-line bg-panel2"
                  }`}
                >
                  {crown}
                  <OptionVisual
                    imageUrl={o.image_url}
                    avatarUrl={avatarOf(o)}
                    name={personOf(o)?.name ?? o.option_text}
                    size={96}
                  />
                  <div className="w-full space-y-1.5">
                    <div className="text-sm font-bold text-center truncate">
                      {o.option_text}
                      {isMine && <span className="text-x text-xs ml-1.5">{t("← あなた")}</span>}
                    </div>
                    <div className="text-xs text-mut text-center">
                      {t("{n}票（{pct}%）", { n: count, pct: pct.toFixed(1) })}
                    </div>
                    <div className="w-full bg-panel rounded-full h-2 overflow-hidden">
                      <div className="bg-x h-full bar-anim" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={o.id}
                className={`relative px-4 py-3 rounded-xl border ${
                  isMine ? "border-x bg-xsoft" : "border-line bg-panel2"
                }`}
              >
                {crown}
                <div className="flex items-center gap-3">
                  {!o.image_url && avatarOf(o) && (
                    <Avatar
                      name={personOf(o)?.name ?? o.option_text}
                      avatarUrl={avatarOf(o)}
                      size={40}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium truncate mr-2">
                        <span className="text-mut mr-1.5">{t("{n}位", { n: i + 1 })}</span>
                        {o.option_text}
                        {isMine && <span className="text-x text-xs ml-2">{t("← あなたの投票")}</span>}
                      </span>
                      <span className="text-mut shrink-0 ml-3">
                        {t("{n}票（{pct}%）", { n: count, pct: pct.toFixed(1) })}
                      </span>
                    </div>
                    <div className="w-full bg-panel rounded-full h-2 overflow-hidden mt-1.5">
                      <div className="bg-x h-full bar-anim" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
                {o.image_url && (
                  <div className="mt-2">
                    <OptionVisual imageUrl={o.image_url} avatarUrl={null} name={o.option_text} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pollType === "three_plus_open" && (
        <div className="mt-5 pt-4 border-t border-line">
          <p className="text-sm font-bold mb-2">{t("選択肢を追加する")}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={addText}
              onChange={(e) => setAddText(e.target.value.slice(0, 100))}
              placeholder={t("新しい選択肢")}
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
              {t("追加")}
            </button>
          </div>
          <ImageUploadField value={addImage} onChange={setAddImage} className="mt-2" />
          <p className="text-xs text-mut mt-1.5">
            {t("※ 追加できるのは投稿者以外・1人3個まで・全体で20個まで")}
          </p>
        </div>
      )}
    </section>
  );
}
