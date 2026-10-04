import { NextResponse } from "next/server";
import { buildMetaDat, resolveMetaThread } from "@/lib/thread2ch";
import { to2chResponse } from "@/lib/bbs2ch";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const raw = key.replace(/\.dat$/i, "");
  const thread = resolveMetaThread(raw);
  if (!thread || thread.kind !== "meta") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return to2chResponse(await buildMetaDat());
}
