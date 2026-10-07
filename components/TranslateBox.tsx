"use client";

import { useState } from "react";
import { Languages } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n-client";
import CommentText from "./CommentText";
import LinkEmbeds from "./LinkEmbeds";

/**
 * ユーザー投稿（コメント・bio等）の翻訳ボタン付き表示。
 * jaのときはボタンを出さず原文のみ。それ以外のロケールでは翻訳ボタン→訳文を下に表示。
 */
export default function TranslateBox({
  text,
  className,
  variant = "comment",
}: {
  text: string;
  className?: string;
  variant?: "comment" | "plain";
}) {
  const locale = useLocale();
  const t = useT();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [translated, setTranslated] = useState("");

  const original =
    variant === "comment" ? (
      <>
        <CommentText content={text} className={className} />
        <LinkEmbeds text={text} />
      </>
    ) : (
      <p className={className}>{text}</p>
    );

  if (locale === "ja") return original;

  const onClick = async () => {
    if (state === "loading") return;
    if (state === "done") {
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, to: locale }),
      });
      const data = await res.json();
      if (data.success && typeof data.result === "string") {
        setTranslated(data.result);
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  };

  return (
    <div>
      {original}
      <button
        onClick={onClick}
        className="mt-1 inline-flex items-center gap-1 text-xs text-mut hover:text-x transition"
      >
        <Languages className="w-3.5 h-3.5" />
        {state === "loading" ? t("翻訳中...") : state === "done" ? t("翻訳を閉じる") : t("翻訳")}
      </button>
      {state === "done" && (
        <div className="mt-1.5 pl-3 border-l-2 border-line text-sm leading-relaxed text-mut whitespace-pre-wrap break-words">
          {translated}
        </div>
      )}
      {state === "error" && <p className="text-xs text-bad mt-1">{t("翻訳できませんでした")}</p>}
    </div>
  );
}
