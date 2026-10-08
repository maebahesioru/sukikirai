"use client";

// Twemoji（Xの絵文字）描画: テキスト内の絵文字をCDNのSVG画像に置換する。
// ライブラリ（約40KB）は絵文字を含むテキストを描画する時だけ遅延ロードする
// （絵文字が無いテキストはReactの通常描画のみ＝初期バンドルに載らない）。
import { useEffect, useState } from "react";

const BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/";
// 絵文字が含まれるかの高速判定（含まれなければロードすらしない）
const HAS_EMOJI = /[\p{Extended_Pictographic}\u20E3]/u;

type TwemojiParser = { parse: (s: string, o: Record<string, unknown>) => string };

let parserPromise: Promise<TwemojiParser> | null = null;
function loadParser(): Promise<TwemojiParser> {
  if (!parserPromise) {
    parserPromise = import("@twemoji/api").then((m) => m.default as unknown as TwemojiParser);
  }
  return parserPromise;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function EmojiText({
  text,
  className,
  highlight,
}: {
  text: string;
  className?: string;
  highlight?: string;
}) {
  const needs = !!highlight || HAS_EMOJI.test(text);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!needs) return;
    let alive = true;
    loadParser()
      .then((twemoji) => {
        if (!alive) return;
        // 安全: 先にHTMLエスケープした文字列へ <mark> と twemoji の <img> のみを挿入する
        // （ユーザー入力がそのままHTMLに入ることはない）
        let h = escapeHtml(text);
        const hl = highlight ? escapeHtml(highlight.trim()) : "";
        if (hl) {
          const re = new RegExp(hl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          h = h.replace(re, (m) => `<mark class="search-hl">${m}</mark>`);
        }
        setHtml(
          twemoji.parse(h, {
            folder: "svg",
            ext: ".svg",
            base: BASE,
            className: "emoji",
          })
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [text, highlight, needs]);

  // ハイライト無し＆絵文字無し → 通常のReact描画（最速・安全）
  if (!needs) return <span className={className}>{text}</span>;
  // パーサー読み込み完了前は素テキスト（ハイドレーション直後に画像へ置換）
  if (html == null) return <span className={className}>{text}</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
