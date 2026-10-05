"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";

type Item = { name: string; url: string; category: string };

/** カテゴリ → 絵文字（商品画像はアソシエイト規約でAPIなし不可のため、カテゴリアイコンで視覚化） */
const CATEGORY_EMOJI: Record<string, string> = {
  "スポーツ・アウトドア": "⚽",
  "ガジェット・家電": "🔌",
  "ホビー・おもちゃ": "🧸",
  "PC・作業環境": "💻",
  "音・配信・DTM": "🎧",
  "食品・飲料": "🍫",
  "ファッション": "👕",
  "生活・キッチン": "🍳",
  "健康・ドラッグ": "💊",
  "生活・収納・家具": "🛋️",
  "DIY・工具・ガーデン": "🔧",
  "ペット": "🐾",
  "ベビー・キッズ": "🍼",
  "文具・オフィス": "✏️",
  "カー・バイク": "🚗",
  "コスメ・美容": "💄",
  "防災・生活": "🧯",
  "ゲーム": "🎮",
  "CD・音楽・映像": "💿",
  "生活・雑貨": "🧺",
  "本": "📚",
  "産業・研究": "🏭",
  "寝具・タオル": "🛏️",
  "充電・モバイル": "🔋",
  "防犯・カメラ": "📷",
};

export function categoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? "🛒";
}

type Props = {
  /** inline = フッター直上（5件） / rail = ワイド画面の左右レール（10件） */
  variant?: "inline" | "rail";
};

/**
 * おすすめ商品（広告）ウィジェット。
 * Amazonアソシエイトのテキストリンクをランダム表示する。
 * 画像・価格はアソシエイト規約上Creators API経由でのみ表示可能なため、ここでは使わない。
 */
export function AmazonPicks({ variant = "inline" }: Props) {
  const t = useT();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [closed, setClosed] = useState(false);
  const count = variant === "rail" ? 10 : 5;

  // 閉じるのはこの画面表示限り（リロードで復活）
  const handleClose = useCallback(() => {
    setClosed(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/amazon-picks?n=${count}`, { cache: "no-store" });
      if (r.ok) {
        const j = (await r.json()) as { items?: Item[] };
        setItems(j.items ?? []);
      }
    } catch {
      /* 表示できなければ非表示のまま */
    } finally {
      setLoading(false);
    }
  }, [count]);

  useEffect(() => {
    void load();
  }, [load]);

  if (closed) return null;
  if (!loading && items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 text-left">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">{t("おすすめ商品")}</h2>
          <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium text-mut">
            {t("広告")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-line bg-panel2 px-3 py-1 text-xs font-medium text-mut transition hover:border-line2 hover:text-txt disabled:opacity-50"
          >
            {loading ? t("読み込み中…") : t("引き直す")}
          </button>
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("広告を閉じる")}
            title={t("閉じる")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 text-sm leading-none text-mut transition hover:border-line2 hover:text-txt"
          >
            ✕
          </button>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={`${it.url}-${i}`} className="flex items-baseline gap-2 text-sm">
            <span aria-hidden className="shrink-0 text-base leading-none" title={t(it.category)}>
              {categoryEmoji(it.category)}
            </span>
            <a
              href={it.url}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className="min-w-0 flex-1 truncate text-x underline-offset-2 hover:underline"
              title={it.name}
            >
              {it.name}
            </a>
            <span className="shrink-0 text-[10px] text-mut">{t(it.category)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] leading-relaxed text-mut">
        {t("Amazonのアソシエイトとして、当サイトは適格販売により収入を得ています。価格・在庫はAmazonの商品ページでご確認ください。")}
      </p>
    </section>
  );
}
