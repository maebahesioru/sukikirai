"use client";

import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { useT } from "@/lib/i18n-client";

// 姉妹サイト（馴れ合いサークル）の紹介ポップアップ — スクロールで右下に出現（2026-10-13）
const HIDE_KEY = "suki-sister-hide";
const HIDE_DAYS = 7;
const SISTER_URL = "https://nareaitter.hikamers.app/";

export default function SisterSitePopup() {
  const t = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let until = 0;
    try {
      until = Number(localStorage.getItem(HIDE_KEY) || 0);
    } catch {
      /* noop */
    }
    if (Date.now() < until) return;
    const onScroll = () => {
      if (window.scrollY > 700) {
        setShow(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // リロードで途中位置から復元された場合
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 864e5));
    } catch {
      /* noop */
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[320px] max-w-[calc(100vw-2rem)] sister-popup-in"
      role="complementary"
      aria-label={t("姉妹サイト")}
    >
      <div className="bg-panel2 border border-line rounded-xl shadow-2xl p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-xsoft text-x flex items-center justify-center font-black text-lg shrink-0">
            馴
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-mut leading-none">{t("姉妹サイト")}</div>
            <div className="text-sm font-bold mt-1">馴れ合いサークル</div>
            <p className="text-[11px] text-mut mt-1 leading-relaxed">
              {t("Xの交流関係をサークル表示・AI診断つきで可視化。")}
            </p>
            <a
              href={SISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-lg bg-x text-white text-xs font-bold hover:opacity-90 transition"
            >
              {t("見てみる")}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={dismiss}
            aria-label={t("閉じる")}
            className="shrink-0 -m-1 p-1 rounded text-mut hover:text-x transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
