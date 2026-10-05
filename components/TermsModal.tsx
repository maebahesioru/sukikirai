"use client";

import { useState } from "react";
import Cookies from "js-cookie";
import { ScrollText } from "lucide-react";
import TermsContent from "./TermsContent";
import { useT } from "@/lib/i18n-client";

export default function TermsModal({ onAgree }: { onAgree: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const agree = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/terms", { method: "POST" });
      const data = await res.json();
      if (!data?.success) {
        alert(t("エラーが発生しました。ページをリロードして再度お試しください。"));
        setBusy(false);
        return;
      }
      Cookies.set("user_token", data.userToken, {
        expires: new Date(data.expiresAt),
        sameSite: "strict",
      });
      onAgree();
    } catch {
      alert(t("エラーが発生しました。"));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-panel border border-line rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-like to-dislike flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-white" />
            </span>
            <h2 className="text-xl font-bold">{t("利用規約への同意")}</h2>
          </div>

          <div className="bg-panel2 rounded-xl p-5 mb-6 max-h-96 overflow-y-auto border border-line">
            <TermsContent />
          </div>

          <p className="text-sm text-mut mb-4">
            {t("上記の利用規約をお読みいただき、同意される場合は「同意する」ボタンをクリックしてください。")}
          </p>

          <button
            onClick={agree}
            disabled={busy}
            className={`w-full py-3 rounded-xl font-bold text-white transition ${
              busy
                ? "bg-panel2 text-mut cursor-not-allowed"
                : "bg-gradient-to-r from-like to-dislike hover:opacity-90"
            }`}
          >
            {busy ? t("処理中...") : t("同意する")}
          </button>

          <p className="text-xs text-mut mt-4 text-center">
            {t("※同意することで匿名の書き込み用IDが発行されます（1年間有効）")}
          </p>
        </div>
      </div>
    </div>
  );
}
