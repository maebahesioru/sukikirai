"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import Avatar from "@/components/Avatar";
import EmojiText from "@/components/EmojiText";
import { useT } from "@/lib/i18n-client";

type Result =
  | { status: "adding" }
  | {
      status: "done";
      id: string;
      name: string;
      handle: string | null;
      avatar_url: string | null;
      created: boolean;
    }
  | { status: "error"; message: string };

/** 未登録の@IDをその場で追加する。追加後は結果カードを表示（自動遷移はしない） */
export default function SearchAutoAdd({ query }: { query: string }) {
  const t = useT();
  const [state, setState] = useState<Result>({ status: "adding" });
  const fired = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    (async () => {
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
        setState({
          status: "done",
          id: data.person.id,
          name: data.person.name,
          handle: data.person.handle ?? null,
          avatar_url: data.person.avatar_url ?? null,
          created: data.created,
        });
      } catch {
        setState({ status: "error", message: t("通信エラーが発生しました") });
      }
    })();
  }, [query, attempt]);

  if (state.status === "adding") {
    return (
      <section>
        <h2 className="font-bold mb-3">{t("検索結果")}</h2>
        <div className="bg-panel border border-x/40 rounded-2xl p-8 text-center max-w-md">
          <Loader2 className="w-8 h-8 text-x animate-spin mx-auto mb-3" />
          <p className="font-bold">{t("「{q}」をXで検索して追加しています…", { q: query })}</p>
          <p className="text-xs text-mut mt-1">{t("未登録のユーザーはその場でページを作成します")}</p>
        </div>
      </section>
    );
  }

  if (state.status === "done") {
    return (
      <section>
        <h2 className="font-bold mb-3">{t("検索結果")}</h2>
        <div className="max-w-md">
          <Link
            href={`/person/${state.id}`}
            className="block bg-panel border border-good/40 rounded-2xl p-4 hover:border-good transition"
          >
            <div className="flex items-center gap-3">
              <Avatar name={state.name} avatarUrl={state.avatar_url} size={44} />
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate flex items-center gap-1.5">
                  <span className="truncate"><EmojiText text={state.name} /></span>
                  <CheckCircle2 className="w-4 h-4 text-good shrink-0" />
                </div>
                {state.handle && <div className="text-xs text-mut truncate">@{state.handle}</div>}
              </div>
              <span className="text-xs text-x shrink-0">{t("ページを見る →")}</span>
            </div>
            <p className="text-xs text-good mt-2">
              {state.created ? t("未登録だったので追加しました") : t("登録済みでした")}
              {t("（クリックでページを開きます）")}
            </p>
          </Link>
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
        <button
          onClick={() => {
            fired.current = false;
            setState({ status: "adding" });
            setAttempt((a) => a + 1);
          }}
          className="px-5 py-2 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
        >
          {t("もう一度試す")}
        </button>
      </div>
    </section>
  );
}
