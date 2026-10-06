// scripts/dryrun-category.ts — 本番ダンプに新辞書を適用して変化を事前確認（DBには触らない）
import { readFileSync } from "node:fs";
import { classifyCategory } from "../lib/tag-rules";
import wikiHandles from "../data/hikamer-wiki-handles.json";

const WIKI = new Set<string>((wikiHandles as string[]).map((h) => h.toLowerCase()));

const rows = JSON.parse(
  readFileSync("/home/maebahesioru/.hermes/cache/scratch/people_dump.json", "utf8")
) as {
  id: string;
  name: string;
  handle: string;
  bio: string;
  x_website: string;
  x_tweet_signals: string;
  category: string;
}[];

const changes: { name: string; handle: string; from: string; to: string; bio: string }[] = [];
for (const r of rows) {
  const cat = classifyCategory(
    r.name,
    [r.bio, r.x_website, r.x_tweet_signals].filter(Boolean).join("\n"),
    r.category === "ヒカマー",
    r.handle,
    WIKI.has(r.handle.toLowerCase())
  );
  if (cat !== r.category) {
    changes.push({ name: r.name, handle: r.handle, from: r.category, to: cat, bio: r.bio.slice(0, 80) });
  }
}

console.log("総数:", rows.length, "変化:", changes.length);
const byMove = new Map<string, number>();
for (const c of changes) {
  const k = `${c.from} → ${c.to}`;
  byMove.set(k, (byMove.get(k) ?? 0) + 1);
}
for (const [k, n] of [...byMove.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${n}`);
}
console.log("\n=== その他 → X の変化サンプル（最大40件） ===");
let shown = 0;
for (const c of changes) {
  if (c.from === "その他" && shown < 40) {
    console.log(`${c.to} | ${c.name} | ${c.handle} | ${c.bio}`);
    shown++;
  }
}
