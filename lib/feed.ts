// Atomフィード生成（2026-10-12）
import { SITE_URL } from "@/lib/site";

export type FeedEntry = {
  title: string;
  link: string;
  updated: string; // ISO
  author: string;
  content: string;
};

export function atomFeed(opts: {
  title: string;
  path: string;
  entries: FeedEntry[];
}): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const self = `${SITE_URL}${opts.path}`;
  const updated = opts.entries[0]?.updated ?? new Date().toISOString();
  const entries = opts.entries
    .map(
      (e) => `  <entry>
    <title>${esc(e.title)}</title>
    <id>${esc(e.link)}</id>
    <link rel="alternate" href="${esc(e.link)}"/>
    <updated>${esc(e.updated)}</updated>
    <author><name>${esc(e.author)}</name></author>
    <content type="text">${esc(e.content)}</content>
  </entry>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ja">
  <title>${esc(opts.title)}</title>
  <id>${esc(self)}</id>
  <link rel="alternate" href="${esc(self)}"/>
  <link rel="self" href="${esc(self)}"/>
  <updated>${esc(updated)}</updated>
  <generator>ツイッタラー世論調査</generator>
${entries}
</feed>`;
}

export const FEED_HEADERS: Record<string, string> = {
  "Content-Type": "application/atom+xml; charset=utf-8",
  "Cache-Control": "public, max-age=300",
};
