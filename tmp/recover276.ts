// 276人（handle欠落）の名前→Xアカウント候補解決（2026-10-13）
// 既存の lib/xsearch.ts（SearXNG→プロフィールタイトル解析→fx実在確認）をそのまま使う。
// 出力: tmp/recover276_result.json（tier: slug / name-exact / review / none）
import { readFileSync, writeFileSync } from "fs";
import { findXUserCandidates } from "@/lib/xsearch";

type Row = { id: string; name: string };

const norm = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[^\p{L}\p{N}]/gu, "");

const people: Row[] = JSON.parse(readFileSync("tmp/missing276.json", "utf8"));
const out: unknown[] = [];

for (let i = 0; i < people.length; i++) {
  const p = people[i];
  let entry: Record<string, unknown> = { id: p.id, name: p.name };
  try {
    const cands = await findXUserCandidates(p.name);
    const slugN = norm(p.id);
    const slugMatch = cands.find((c) => norm(c.handle) === slugN);
    const exact = cands.filter((c) => norm(c.name) === norm(p.name));
    let pick: (typeof cands)[number] | null = null;
    let tier = "none";
    if (slugMatch && !slugMatch.registered) {
      pick = slugMatch;
      tier = "slug";
    } else if (exact.length === 1 && !exact[0].registered) {
      pick = exact[0];
      tier = "name-exact";
    } else if (cands.length > 0) {
      tier = "review";
    }
    entry = {
      ...entry,
      tier,
      pick: pick ? { handle: pick.handle, followers: pick.followers, name: pick.name } : null,
      top: cands.slice(0, 4).map((c) => ({ h: c.handle, n: c.name, reg: c.registered, f: c.followers })),
    };
  } catch (e) {
    entry = { ...entry, tier: "error", error: String(e).slice(0, 120) };
  }
  out.push(entry);
  if ((i + 1) % 10 === 0 || i + 1 === people.length) {
    console.error(`[${i + 1}/${people.length}]`);
    writeFileSync("tmp/recover276_progress.json", JSON.stringify(out, null, 1));
  }
  await new Promise((r) => setTimeout(r, 2800));
}

writeFileSync("tmp/recover276_result.json", JSON.stringify(out, null, 1));
const count = (t: string) => out.filter((e) => (e as { tier: string }).tier === t).length;
console.log(
  `DONE slug=${count("slug")} name-exact=${count("name-exact")} review=${count("review")} none=${count("none")} error=${count("error")}`
);
