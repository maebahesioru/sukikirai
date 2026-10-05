"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ChevronRight, Loader2 } from "lucide-react";
import Avatar from "./Avatar";
import type { XUserCandidate } from "@/lib/types";
import { useT } from "@/lib/i18n-client";

function fmtF(f: number) {
  return f >= 10000 ? `${(f / 10000).toFixed(1)}万` : f.toLocaleString();
}

export default function XUserCandidates({
  query,
  candidates,
}: {
  query: string;
  candidates: XUserCandidate[];
}) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);

  const add = async (c: XUserCandidate) => {
    if (busy) return;
    if (c.personId) {
      router.push(`/person/${c.personId}`);
      return;
    }
    setBusy(c.handle);
    try {
      const res = await fetch("/api/people/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: `@${c.handle}` }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/person/${data.person.id}`);
      } else {
        alert(data.error || t("追加に失敗しました"));
      }
    } catch {
      alert(t("追加に失敗しました"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-panel border border-line rounded-2xl p-5">
      <h2 className="font-bold mb-1">{t("Xで「{q}」の候補が見つかりました", { q: query })}</h2>
      <p className="text-xs text-mut mb-4">
        {t("この中の人ですか？ 選ぶとページを追加して移動します（登録済みならそのまま開きます）")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {candidates.map((c) => (
          <button
            key={c.handle}
            onClick={() => add(c)}
            disabled={busy !== null}
            className="text-left bg-panel2 border border-line rounded-xl p-3 hover:border-x/60 transition disabled:opacity-60 flex gap-3 items-start"
          >
            <Avatar name={c.name} avatarUrl={c.avatarUrl} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm truncate">{c.name}</span>
                {c.registered && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-xsoft text-x">
                    {t("登録済み")}
                  </span>
                )}
              </div>
              <p className="text-xs text-mut">
                {t("@{handle}・フォロワー{n}", { handle: c.handle, n: fmtF(c.followers) })}
              </p>
              {c.description.trim() && (
                <p className="text-xs text-mut line-clamp-2 mt-0.5 leading-snug whitespace-pre-wrap">
                  {c.description.trim()}
                </p>
              )}
            </div>
            <span className="self-center text-mut shrink-0">
              {busy === c.handle ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : c.registered ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
