import { getMetaResCount } from "@/lib/queries";
import { META_THREAD } from "@/lib/constants";
import { metaThreadKey } from "@/lib/thread2ch";
import { sanitizeField, to2chResponse } from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getMetaResCount();
  const line = `${metaThreadKey()}.dat<>${sanitizeField(META_THREAD.title, 120)} (${count})\n`;
  return to2chResponse(line);
}
