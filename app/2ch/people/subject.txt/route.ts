import { listPeopleFor2ch } from "@/lib/queries";
import { assignThreadKeys, sanitizeField, to2chResponse } from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listPeopleFor2ch();
  const keys = assignThreadKeys(rows);
  const lines = rows.map(
    (r) => `${keys.get(r.id)}.dat<>${sanitizeField(`${r.name}の評価・好き嫌い`, 120)} (${r.res_count})`
  );
  return to2chResponse(lines.length ? lines.join("\n") + "\n" : "");
}
