import { findXUserCandidates } from "@/lib/xsearch";
const names = ["ネオ銀_mania@おぜう派", "Мелодимир🅉/מלודימיר(メロディミル)", "もみぢのにしき 神のmani_mani", "Donamani", "腐𝕞𝕒𝕟𝕚", "小鳥さん中尉"];
for (const n of names) {
  try {
    const c = await findXUserCandidates(n);
    console.log(`「${n}」→ ${c.length}件 ${c.slice(0,2).map(x=>"@"+x.handle).join(" ")}`);
  } catch (e) { console.log(`「${n}」→ ERROR ${String(e).slice(0,60)}`); }
}
// コントロール: 既知アカウントが引けるか
const h = await findXUserCandidates("hikakin");
console.log(`\n[コントロール] hikakin → ${h.length}件 ${h.slice(0,3).map(x=>"@"+x.handle).join(" ")}`);
