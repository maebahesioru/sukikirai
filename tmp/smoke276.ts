import { findXUserCandidates } from "@/lib/xsearch";
for (const n of ["ビッキ", "卵の神！！"]) {
  const c = await findXUserCandidates(n);
  console.log(`\n「${n}」→ ${c.length}件`);
  for (const x of c.slice(0, 3)) console.log(`   @${x.handle} (${x.name}) f=${x.followers} reg=${x.registered}`);
}
