import { SITE_URL } from "./site";

/**
 * IndexNow — 新規ページをBing等（ChatGPT検索の裏側もBing）へ即時通知する。
 * 鍵ファイルは public/<key>.txt で配信。失敗しても本処理には影響させない（fire-and-forget）。
 */
export const INDEXNOW_KEY = "af8c30dba217d3886b7a4a5af485530c";

export async function pingIndexNow(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 1000),
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* 通知失敗は無視（次回クロールで拾われる） */
  }
}
