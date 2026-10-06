// scripts/reclassify-prod.ts — 全員のタグ・カテゴリを再判定（辞書更新後の一括反映用）
// 使い方: DATABASE_URL=... bun run scripts/reclassify-prod.ts
import { retagEveryone } from "../lib/autotag";

const r = await retagEveryone("all");
console.log("retag result:", JSON.stringify(r));
process.exit(0);
