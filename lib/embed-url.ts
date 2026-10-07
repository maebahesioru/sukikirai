// リンク埋め込みの共有ユーティリティ（クライアント・サーバー共用・純粋関数のみ）
import { SITE_URL } from "./site";

export type EmbedMedia = { type: "photo" | "video"; url: string };

/** 引用RTの引用元ツイート */
export type EmbedQuote = {
  name: string;
  handle: string;
  avatar: string | null;
  text: string;
  media: EmbedMedia[];
};

export type EmbedData =
  | {
      kind: "tweet";
      url: string;
      name: string;
      handle: string;
      avatar: string | null;
      text: string;
      media: EmbedMedia[];
      quote: EmbedQuote | null;
      likes: number;
      retweets: number;
      date: string | null;
    }
  | {
      kind: "profile";
      url: string;
      name: string;
      handle: string;
      avatar: string | null;
      bio: string;
      followers: number;
    }
  | {
      kind: "og";
      url: string;
      title: string;
      description: string;
      image: string | null;
      site: string | null;
    };

/** 本文からURLを抽出（CommentTextのURL規則と同じ・末尾句読点除去・自サイト除外・重複除去） */
export function extractUrls(text: string, max = 3): string[] {
  const URLCHARS = "A-Za-z0-9\\-._~:\\/?#\\[\\]@!$&'()*+,;=%";
  const re = new RegExp(`https?:\\/\\/[${URLCHARS}]+`, "gi");
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const u = m[0].replace(/[)\]}>,.;:!?。、）」』】]+$/, "");
    if (!u || out.includes(u)) continue;
    if (SITE_URL && u.startsWith(SITE_URL)) continue; // 自サイトのリンクは埋め込まない
    out.push(u);
    if (out.length >= max) break;
  }
  return out;
}

/** X/Twitter系URLの判定（status or profile） */
export function parseXUrl(
  url: string
): { type: "status"; id: string } | { type: "profile"; handle: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const ok = [
      "x.com",
      "www.x.com",
      "twitter.com",
      "www.twitter.com",
      "mobile.twitter.com",
      "vxtwitter.com",
      "www.vxtwitter.com",
      "fxtwitter.com",
      "www.fxtwitter.com",
    ];
    if (!ok.includes(host)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const si = parts.indexOf("status");
    if (si >= 0 && parts[si + 1] && /^\d{5,25}$/.test(parts[si + 1])) {
      return { type: "status", id: parts[si + 1] };
    }
    if (parts.length === 1 && /^[A-Za-z0-9_]{1,15}$/.test(parts[0])) {
      return { type: "profile", handle: parts[0] };
    }
    return null;
  } catch {
    return null;
  }
}
