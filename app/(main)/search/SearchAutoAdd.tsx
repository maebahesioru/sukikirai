"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type Result =
  | { status: "adding" }
  | { status: "done"; id: string; name: string; created: boolean }
  | { status: "error"; message: string };

export default function SearchAutoAdd({ query }: { query: string }) {
  const [state, setState] = useState<Result>({ status: "adding" });
  const router = useRouter();
  const fired = useRef(false);

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
          setState({ status: "error", message: data.error || "追加に失敗しました" });
          return;
        }
        setState({
          status: "done",
          id: data.person.id,
          name: data.person.name,
          created: data.created,
        });
        setTimeout(() => {
          router.push(`/person/${data.person.id}`);
        }, 800);
      } catch {
        setState({ status: "error", message: "通信エラーが発生しました" });
      }
    })();
  }, [query, router]);

  if (state.status === "adding") {
    return (
      <div className="bg-panel border border-x/40 rounded-2xl p-8 text-center">
        <Loader2 className="w-8 h-8 text-x animate-spin mx-auto mb-3" />
        <p className="font-bold">「{query}」をXで検索して追加しています…</p>
        <p className="text-xs text-mut mt-1">未登録のユーザーはその場でページを作成します</p>
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <div className="bg-panel border border-good/40 rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-good mx-auto mb-3" />
        <p className="font-bold">
          「{state.name}」{state.created ? "を追加しました！" : "は登録済みでした！"}
        </p>
        <p className="text-xs text-mut mt-1">ページに移動します…</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-bad/40 rounded-2xl p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-bad mx-auto mb-3" />
      <p className="font-bold mb-1">追加できませんでした</p>
      <p className="text-sm text-mut mb-4">{state.message}</p>
      <button
        onClick={() => {
          if (fired.current) {
            fired.current = false;
            setState({ status: "adding" });
          }
        }}
        className="px-5 py-2 rounded-xl bg-x text-white text-sm font-bold hover:opacity-90 transition"
      >
        もう一度試す
      </button>
    </div>
  );
}
