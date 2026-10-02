// ツイッタラー世論調査: 最小限のサービスワーカー
// - 静的アセット（/_next/static、画像等）だけを cache-first でキャッシュ
// - ページ・APIはそのままネットワークへ（古い画面を見せない）
const CACHE = "tsuittara-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    /\.(png|svg|ico|webp|avif|woff2?)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
