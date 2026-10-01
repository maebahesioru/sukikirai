import { listPollsFor2ch } from "@/lib/queries";
import { sanitizeField, threadKey, to2chResponse } from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await listPollsFor2ch();
  const lines = rows.map(
    (r) => `${threadKey(r.id)}.dat<>${sanitizeField(r.title, 120)} (${r.res_count})`
  );
  return to2chResponse(lines.length ? lines.join("\n") + "\n" : "");
}
