// SearXNG（自ホスト）経由で「名前 → Xユーザー候補」を探す。
// Xの無料APIではユーザー検索ができないため、検索インデックスに載っている
// 「プロフィールページ」のタイトル（例: 「名前 (@handle) / X」「名前 (@handle) on X」）から
// ハンドルを拾い、fxTwitter で実在確認した上で候補として返す。
// ※ツイートページ（タイトル「… on X: "本文"」形式）は著者名が無関係でもプロフィール風に
//   見えるため、パターンで明確に除外する。

import { fetchFxUser } from "./fxtwitter";
import { getPeopleByHandles } from "./queries";
import type { XUserCandidate } from "./types";

// SearXNG の接続先（上から順に試す）。
// 公開URLは Cloudflare 経由のせいで8〜11秒かかり Node fetch が詰まるため、
// LAN 直（本番VM100→MAINPC / ローカルは127.0.0.1）を優先する。
const SEARX_URLS: { url: string; timeout: number }[] = [
  ...(process.env.SEARXNG_URL ? [{ url: process.env.SEARXNG_URL, timeout: 8000 }] : []),
  { url: "http://127.0.0.1:18080", timeout: 4000 },
  { url: "http://192.168.1.4:18080", timeout: 10000 },
  { url: "https://searxng.hikamers.app", timeout: 12000 },
];
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const RESERVED = new Set([
  "home", "i", "search", "explore", "notifications", "messages", "settings", "intent",
  "share", "to", "compose", "has", "about", "en", "ja", "ko", "zh", "login", "signup",
  "privacy", "tos", "help", "topics", "who_to_follow", "account", "direct_messages",
  "bookmarks", "lists", "communities", "twitter", "x",
]);

const TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; data: XUserCandidate[] }>();
let windowStart = 0;
let windowCount = 0;

type Raw = { handle: string; strong: boolean };

async function searx(q: string): Promise<{ url: string; title: string }[]> {
  for (const { url, timeout } of SEARX_URLS) {
    try {
      // エンジン構成（2026-10-03）: searxng側で google cse 等をVM100直出口プロキシ（家庭IP）経由に設定済み。
      // 実測の知見: 旧googleエンジン(/wml/search)は廃止済みで403になるため使わない。
      // Google結果は「google cse」エンジンが取れる（x.comプロフィールも取得可・実測）。
      // ※engines=に未登録の名前(startpage等)を混ぜると無視される（pd_engines空→デフォルト全エンジンに落ちる）ので注意。
      const res = await fetch(
        `${url}/search?format=json&q=${encodeURIComponent(q)}&engines=google%20cse%2Cbing`,
        {
          headers: { "User-Agent": UA, Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(timeout),
        }
      );
      if (!res.ok) continue;
      const d = await res.json();
      return Array.isArray(d?.results) ? d.results.slice(0, 60) : [];
    } catch {
      // 次の接続先へ
    }
  }
  return [];
}

// プロフィールページのタイトルかどうか（ツイートページを除外）
// 「名前 (@handle) / X」「名前 (@handle) on X」「名前 (@handle) | Twitter」などのほか、
// 末尾が「(@handle)」で終わる形（Bingが「/ X」を落とすことがある）も許可する。
function strongProfileTitle(title: string): boolean {
  if (!/\(@[A-Za-z0-9_]{1,15}\)/.test(title)) return false;
  if (/on X[:：]/i.test(title)) return false; // ツイートページ（本文が付く）
  // 末尾アンカー: …(@handle) [ / X | | Twitter | on X | なし ]。
  if (
    /\(@[A-Za-z0-9_]{1,15}\)\s*(?:[-–—|/]\s*(?:X|Twitter)|on\s+(?:X|Twitter))?\s*[.。]?\s*$/i.test(
      title
    )
  ) {
    return true;
  }
  // 末尾以外でも「(@handle) / X」「(@handle) on X」型なら許容
  return /\)\s*\/\s*(?:X|Twitter)\b/i.test(title) || /\)\s*on\s+(?:X|Twitter)\b/i.test(title);
}

function norm(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export async function findXUserCandidates(query: string): Promise<XUserCandidate[]> {
  const q = query.trim().replace(/^@/, "").normalize("NFKC");
  if (!q) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  // 空結果は短命キャッシュ（エンジン一時停止から回復したらすぐ拾えるように）
  if (hit && Date.now() - hit.at < (hit.data.length > 0 ? TTL : 2 * 60 * 1000)) return hit.data;

  // 連打対策: 新規ルックアップは毎分20件まで（超過分は空を返す。同一クエリは上のキャッシュで即返る）
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= 20) return [];
  windowCount++;

  // 4クエリ並行（素の名前 / 名前 X / 名前 (@ / 名前 twitter）。
  // 「(@」を付けるとプロフィールページ（タイトルに「(@handle)」を含む）が上位に来やすい（実測）。
  // site:x.com は google の曖昧マッチで無関係なプロフィールを大量に返すため使わない（実測）。
  const variants = [q, `${q} X`, `${q} (@`, `${q} twitter`];
  const merged = (await Promise.all(variants.map((v) => searx(v)))).flat();
  const map = new Map<string, Raw>();
  for (const r of merged) {
    const url = String(r.url ?? "");
    const title = String(r.title ?? "");
    const strong = strongProfileTitle(title);
    const mu = url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/);
    if (mu && !RESERVED.has(mu[1].toLowerCase())) {
      const k = mu[1].toLowerCase();
      const e = map.get(k) ?? { handle: mu[1], strong: false };
      if (strong) e.strong = true;
      map.set(k, e);
    }
    if (strong) {
      for (const m of title.matchAll(/\(@([A-Za-z0-9_]{1,15})\)/g)) {
        const h = m[1];
        if (RESERVED.has(h.toLowerCase())) continue;
        const k = h.toLowerCase();
        const e = map.get(k) ?? { handle: h, strong: false };
        e.strong = true;
        map.set(k, e);
      }
    }
  }

  const raws = [...map.values()]
    .sort((x, y) => Number(y.strong) - Number(x.strong))
    .slice(0, 16);

  const enriched: { r: Raw; fx: NonNullable<Awaited<ReturnType<typeof fetchFxUser>>> }[] = [];
  for (const item of await Promise.all(
    raws.map(async (r) => ({ r, fx: await fetchFxUser(r.handle) }))
  )) {
    if (item.fx) enriched.push({ r: item.r, fx: item.fx });
  }

  const nq = norm(q);
  const scored = enriched
    .map(({ r, fx }) => {
      const nname = norm(fx.name);
      let sim = 0;
      if (nq && nname === nq) sim = 4;
      else if (nq.length >= 2 && (nname.includes(nq) || nq.includes(nname))) sim = 2;
      return { r, fx, sim };
    })
    .filter((e) => e.sim > 0 || e.r.strong)
    .sort(
      (x, y) =>
        y.sim - x.sim ||
        Number(y.r.strong) - Number(x.r.strong) ||
        y.fx.followers - x.fx.followers
    )
    .slice(0, 8);

  const registered = await getPeopleByHandles(scored.map((e) => e.fx.screenName || e.r.handle));
  const regMap = new Map(registered.map((p) => [(p.handle ?? "").toLowerCase(), p]));

  const out: XUserCandidate[] = scored.map((e) => {
    const handle = e.fx.screenName || e.r.handle;
    const p = regMap.get(handle.toLowerCase());
    return {
      handle,
      name: e.fx.name,
      avatarUrl: e.fx.avatarUrl,
      description: e.fx.description,
      followers: e.fx.followers,
      registered: !!p,
      personId: p?.id ?? null,
    };
  });

  cache.set(key, { at: Date.now(), data: out });
  return out;
}
