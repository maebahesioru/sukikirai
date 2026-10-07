// リンク埋め込みデータの取得（サーバー専用）: X/TwitterはFxTwitter API・その他はOGPメタ。
// 1時間インメモリキャッシュ。SSRFガード付き。
import type { EmbedData, EmbedMedia, EmbedQuote } from "./embed-url";
import { parseXUrl } from "./embed-url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 500;
const cache = new Map<string, { at: number; data: EmbedData | null }>();

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

async function fetchTweetEmbed(id: string): Promise<EmbedData | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/status/${id}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const t = data?.tweet;
    if (!t || !t.author) return null;
    const media: EmbedMedia[] = [];
    for (const m of t.media?.all ?? []) {
      if (m?.type === "photo" && m.url) media.push({ type: "photo", url: String(m.url) });
      else if (m?.type === "video" && m.thumbnail_url)
        media.push({ type: "video", url: String(m.thumbnail_url) });
      else if (m?.type === "gif" && m.thumbnail_url)
        media.push({ type: "video", url: String(m.thumbnail_url) });
      else if (m?.url) media.push({ type: "photo", url: String(m.url) });
      if (media.length >= 4) break;
    }
    const quoteRaw = t.quote;
    let quote: EmbedQuote | null = null;
    if (quoteRaw && quoteRaw.author && quoteRaw.text) {
      const qmedia: EmbedMedia[] = [];
      for (const m of quoteRaw.media?.all ?? []) {
        if (m?.type === "photo" && m.url) {
          qmedia.push({ type: "photo", url: String(m.url) });
          break;
        }
        if ((m?.type === "video" || m?.type === "gif") && m.thumbnail_url) {
          qmedia.push({ type: "video", url: String(m.thumbnail_url) });
          break;
        }
      }
      quote = {
        name: String(quoteRaw.author.name ?? "").slice(0, 80),
        handle: String(quoteRaw.author.screen_name ?? ""),
        avatar: quoteRaw.author.avatar_url || null,
        text: String(quoteRaw.text ?? "").slice(0, 500),
        media: qmedia,
      };
    }
    return {
      kind: "tweet",
      url: String(t.url || `https://x.com/i/status/${id}`),
      name: String(t.author.name ?? "").slice(0, 80),
      handle: String(t.author.screen_name ?? ""),
      avatar: t.author.avatar_url || null,
      text: String(t.text ?? "").slice(0, 1200),
      media,
      quote,
      likes: num(t.likes),
      retweets: num(t.retweets),
      date: t.created_at ? String(t.created_at) : null,
    };
  } catch {
    return null;
  }
}

async function fetchProfileEmbed(handle: string): Promise<EmbedData | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.user;
    if (!u || !u.screen_name) return null;
    return {
      kind: "profile",
      url: `https://x.com/${u.screen_name}`,
      name: String(u.name ?? "").slice(0, 80),
      handle: String(u.screen_name),
      avatar: u.avatar_url || null,
      bio: String(u.description ?? "").slice(0, 300),
      followers: num(u.followers),
    };
  } catch {
    return null;
  }
}

/** SSRFガード: http(s)のみ・IPリテラル拒否・DNS解決してプライベートIP拒否 */
async function isSafeUrl(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".home.arpa")
    ) {
      return false;
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return false;
    const dns = await import("dns/promises");
    const addrs = await dns.lookup(host, { all: true }).catch(() => []);
    if (addrs.length === 0) return false;
    for (const r of addrs) {
      const a = r.address;
      if (
        a.startsWith("10.") ||
        a.startsWith("127.") ||
        a.startsWith("192.168.") ||
        a.startsWith("169.254.") ||
        a.startsWith("100.") ||
        a.startsWith("0.") ||
        a === "::1" ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(a) ||
        a.startsWith("fc") ||
        a.startsWith("fd") ||
        a.startsWith("fe80")
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      try {
        return String.fromCodePoint(parseInt(d, 10));
      } catch {
        return "";
      }
    })
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

async function fetchOgEmbed(url: string): Promise<EmbedData | null> {
  if (!(await isSafeUrl(url))) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(ct)) return null;
    const reader = res.body?.getReader();
    let buf = new Uint8Array(0);
    let total = 0;
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.length;
        if (total > 262144) {
          try {
            await reader.cancel();
          } catch {
            /* noop */
          }
          break;
        }
        const nb = new Uint8Array(buf.length + value.length);
        nb.set(buf);
        nb.set(value, buf.length);
        buf = nb;
      }
    }
    const headUtf8 = new TextDecoder("utf-8").decode(buf.slice(0, 4096));
    const cm = ct.match(/charset=([\w-]+)/i) ?? headUtf8.match(/charset=["']?([\w-]+)/i);
    const charset = (cm?.[1] ?? "utf-8").toLowerCase();
    let html: string;
    try {
      html = new TextDecoder(charset).decode(buf);
    } catch {
      html = headUtf8;
    }
    const meta = (prop: string): string => {
      const re1 = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*?content=["']([^"']*)["']`,
        "i"
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*?(?:property|name)=["']${prop}["']`,
        "i"
      );
      const m = html.match(re1) ?? html.match(re2);
      return m ? decodeEntities(m[1]).trim() : "";
    };
    const title = (
      meta("og:title") ||
      meta("twitter:title") ||
      decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim()
    ).slice(0, 200);
    const description = (
      meta("og:description") ||
      meta("twitter:description") ||
      meta("description")
    ).slice(0, 400);
    let image: string | null =
      meta("og:image") || meta("og:image:url") || meta("twitter:image") || null;
    if (image) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = null;
      }
    }
    const site = meta("og:site_name") || null;
    if (!title && !description) return null;
    return { kind: "og", url, title, description, image, site };
  } catch {
    return null;
  }
}

export async function getEmbed(url: string): Promise<EmbedData | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  let data: EmbedData | null = null;
  const x = parseXUrl(url);
  if (x?.type === "status") data = await fetchTweetEmbed(x.id);
  else if (x?.type === "profile") data = await fetchProfileEmbed(x.handle);
  else data = await fetchOgEmbed(url);
  if (cache.size >= MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(url, { at: Date.now(), data });
  return data;
}
