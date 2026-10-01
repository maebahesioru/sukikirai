// SearXNG（自ホスト）経由で「名前 → Xユーザー候補」を探す。
// Xの無料APIではユーザー検索ができないため、検索インデックスに載っている
// プロフィールページ（タイトルの「(@handle) / X」パターン等）からハンドルを拾い、
// fxTwitter で実在確認した上で候補として返す。

import { fetchFxUser } from "./fxtwitter";
import { getPeopleByHandles } from "./queries";
import type { XUserCandidate } from "./types";

// SearXNG の接続先（上から順に試す）。
// 公開URLは Cloudflare 経由のせいで8〜11秒かかり Node fetch が詰まるため、
// LAN 直（本番VM100→MAINPC / ローカルは127.0.0.1）を優先する。
const SEARX_URLS: { url: string; timeout: number }[] = [
  ...(process.env.SEARXNG_URL ? [{ url: process.env.SEARXNG_URL, timeout: 8000 }] : []),
  { url: "http://127.0.0.1:18080", timeout: 3000 },
  { url: "http://192.168.1.4:18080", timeout: 3000 },
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

type Raw = { handle: string; profile: boolean };

async function searx(q: string): Promise<{ url: string; title: string }[]> {
  for (const { url, timeout } of SEARX_URLS) {
    try {
      const res = await fetch(`${url}/search?format=json&q=${encodeURIComponent(q)}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(timeout),
      });
      if (!res.ok) continue;
      const d = await res.json();
      return Array.isArray(d?.results) ? d.results.slice(0, 60) : [];
    } catch {
      // 次の接続先へ
    }
  }
  return [];
}

function norm(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export async function findXUserCandidates(query: string): Promise<XUserCandidate[]> {
  const q = query.trim().replace(/^@/, "");
  if (!q) return [];
  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  // 連打対策: 新規ルックアップは毎分40件まで（超過分は空を返す。同一クエリは上のキャッシュで即返る）
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  if (windowCount >= 40) return [];
  windowCount++;

  // 3クエリ並行（素の名前 / 名前 X / site:x.com）。片方が空でも他が拾う。
  const [a, b, c] = await Promise.all([searx(q), searx(`${q} X`), searx(`${q} site:x.com`)]);
  const map = new Map<string, Raw>();
  for (const r of [...a, ...b, ...c]) {
    const url = String(r.url ?? "");
    const title = String(r.title ?? "");
    const profileish =
      /\(@?[A-Za-z0-9_]{1,15}\)/.test(title) || /\/\s*X\b/.test(title) || / on X/.test(title);
    const mu = url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/);
    if (mu && !RESERVED.has(mu[1].toLowerCase())) {
      const k = mu[1].toLowerCase();
      const e = map.get(k) ?? { handle: mu[1], profile: false };
      if (profileish) e.profile = true;
      map.set(k, e);
    }
    for (const m of title.matchAll(/\(@([A-Za-z0-9_]{1,15})\)/g)) {
      const h = m[1];
      if (RESERVED.has(h.toLowerCase())) continue;
      const k = h.toLowerCase();
      const e = map.get(k) ?? { handle: h, profile: false };
      e.profile = true;
      map.set(k, e);
    }
  }

  const raws = [...map.values()]
    .sort((x, y) => Number(y.profile) - Number(x.profile))
    .slice(0, 12);

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
    .filter((e) => e.sim > 0 || e.r.profile)
    .sort((x, y) => y.sim - x.sim || y.fx.followers - x.fx.followers)
    .slice(0, 6);

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
