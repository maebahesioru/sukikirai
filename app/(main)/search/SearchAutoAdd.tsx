"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, UserPlus } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type State =
  | { status: "confirm" }
  | { status: "adding" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * 未登録の@IDをその場で追加する。
 * 勝手には追加せず、確認ポップを挟んでから追加し、完了後にページを開く。
 */
export default function SearchAutoAdd({ query }: { query: string }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "confirm" });

  const add = async () => {
    setState({ status: "adding" });
    try {
      const res = await fetch("/api/people/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!data.success) {
        setState({ status: "error", message: data.error || t("追加に失敗しました") });
        return;
      }
      router.push(`/person/${data.person.id}`);
    } catch {
      setState({ status: "error", message: t("通信エラーが発生しました") });
    }
  };

  // 確認ポップ中はEscキーでもキャンセル
  useEffect(() => {
    if (state.status !== "confirm") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState({ status: "cancelled" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.status]);

  if (state.status === "confirm" || state.status === "adding") {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        onClick={(e) => {
          if (state.status === "confirm" && e.target === e.currentTarget) {
            setState({ status: "cancelled" });
          }
        }}
      >
        <div className="bg-panel border border-line rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          {state.status === "adding" ? (
            <>
              <Loader2 className="w-8 h-8 text-x animate-spin mx-auto mb-3" />
              <p className="font-bold">
                {t("「{q}」をXで検索して追加しています…", { q: query })}
              </p>
              <p className="text-xs text-mut mt-1">
                {t("未登録のユーザーはその場でページを作成します")}
              </p>
            </>
          ) : (
            <>
              <UserPlus className="w-8 h-8 text-x mx-auto mb-3" />
              <h2 className="font-bold mb-1">
                {t("「{q}」はまだ登録されていません", { q: query })}
              </h2>
              <p className="text-sm text-mut mb-1">{t("追加してページを開きますか？")}</p>
              <p className="text-xs text-mut mb-5">{t("誰でも匿名で追加できます")}</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={add}
                  className="px-5 py-2.5 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
                >
                  {t("追加して開く")}
                </button>
                <button
                  onClick={() => setState({ status: "cancelled" })}
                  className="px-5 py-2.5 rounded-xl border border-line text-sm font-bold text-mut hover:text-txt transition"
                >
                  {t("やめる")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (state.status === "cancelled") {
    return (
      <section>
        <h2 className="font-bold mb-3">{t("検索結果")}</h2>
        <div className="bg-panel border border-line rounded-2xl p-5 max-w-md">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">
                {t("「{q}」は未登録です", { q: query })}
              </p>
              <p className="text-xs text-mut mt-0.5">{t("誰でも匿名で追加できます")}</p>
            </div>
            <button
              onClick={add}
              className="px-4 py-2 rounded-xl bg-x text-white text-xs font-bold hover:opacity-90 transition shrink-0"
            >
              {t("追加する")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-bold mb-3">{t("検索結果")}</h2>
      <div className="bg-panel border border-bad/40 rounded-2xl p-6 text-center max-w-md">
        <AlertTriangle className="w-8 h-8 text-bad mx-auto mb-3" />
        <p className="font-bold mb-1">{t("追加できませんでした")}</p>
        <p className="text-sm text-mut mb-4">{state.message}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={add}
            className="px-5 py-2 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
          >
            {t("もう一度試す")}
          </button>
          <button
            onClick={() => setState({ status: "cancelled" })}
            className="px-5 py-2 rounded-xl border border-line text-sm font-bold text-mut hover:text-txt transition"
          >
            {t("やめる")}
          </button>
        </div>
      </div>
    </section>
  );
}
