// クローラー判定（2026-10-11・SEO: ゲート付きコンテンツのGoogle公式プロトコル用）
// Googlebot/BingbotはrDNS検証（なりすまし対策）・その他ボットはUAベース。
// 判定結果はメモリキャッシュ（1時間）。失敗時はfalse（安全側＝ユーザー扱い）。
import { headers } from "next/headers";
import dns from "node:dns/promises";

const BOT_RE =
  /(googlebot|mediapartners|adsbot|bingbot|bingpreview|yandexbot|duckduckbot|baiduspider|slurp|twitterbot|facebookexternalhit|linkedinbot|applebot|petalbot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|bytespider|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-web|anthropic-ai|perplexitybot|ccbot|amazonbot|googleother|discordbot|telegrambot|slackbot|whatsapp|embedly|quora link preview|pinterest|vkshare|w3c_validator|diffbot|imagesiftbot|youbot)/i;

const cache = new Map<string, { ok: boolean; exp: number }>();

async function verifyRdns(ip: string, suffixes: string[]): Promise<boolean> {
  const key = `${ip}:${suffixes[0]}`;
  const c = cache.get(key);
  if (c && c.exp > Date.now()) return c.ok;
  let ok = false;
  try {
    const names = await dns.reverse(ip);
    for (const n of names) {
      const lower = n.toLowerCase();
      if (suffixes.some((s) => lower.endsWith(s))) {
        try {
          const addrs = await dns.resolve4(n);
          if (addrs.includes(ip)) {
            ok = true;
            break;
          }
        } catch {
          /* 解決失敗はスキップ */
        }
      }
    }
  } catch {
    ok = false;
  }
  cache.set(key, { ok, exp: Date.now() + 3600_000 });
  return ok;
}

/** リクエストがクローラーか（rDNS検証済みの主要ボット or UA一致のその他ボット） */
export async function isCrawler(): Promise<boolean> {
  try {
    const h = await headers();
    const ua = h.get("user-agent") ?? "";
    if (!BOT_RE.test(ua)) return false;
    const ip = (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for") ?? "").split(",")[0].trim();
    if (/googlebot|mediapartners|adsbot/i.test(ua)) {
      if (!ip) return false;
      return (await verifyRdns(ip, [".googlebot.com", ".google.com"])) === true;
    }
    if (/bingbot/i.test(ua)) {
      if (!ip) return false;
      return (await verifyRdns(ip, [".search.msn.com"])) === true;
    }
    // その他のクローラー: UA一致で許可（ゲートの実害なし・なりすましは投票で防げる）
    return true;
  } catch {
    return false;
  }
}
