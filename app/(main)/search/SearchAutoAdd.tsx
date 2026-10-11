"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n-client";

type State =
  | { status: "adding" }
  | { status: "cancelled" }
  | { status: "error"; message: string };

/**
 * 未登録の@IDをその場で自動追加する。
 * 2026-10-12: 確認ポップを廃止して自動追加に戻した（検索→即追加→ページを開く）。
 * 失敗時のみエラーを表示する。
 */
export default function SearchAutoAdd({ query }: { query: string }) {
  const t = useT();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "adding" });
  const started = useRef(false);

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

  // マウント直後に自動で追加（StrictModeの二重実行はrefでガード）
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    add();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "adding") {
    return (
      <section>
        <h2 className="font-bold mb-3">{t("検索結果")}</h2>
        <div className="bg-panel border border-line rounded-2xl p-8 text-center max-w-md">
          <Loader2 className="w-8 h-8 text-x animate-spin mx-auto mb-3" />
          <p className="font-bold">
            {t("「{q}」をXで検索して追加しています…", { q: query })}
          </p>
          <p className="text-xs text-mut mt-1">
            {t("未登録のユーザーはその場でページを作成します")}
          </p>
        </div>
      </section>
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
