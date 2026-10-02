import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { listTagTargets, setPeopleTags } from "@/lib/queries";
import { classifyByRules } from "@/lib/tag-rules";

/** 全員（またはタグ空の人）のタグをキーワード辞書で再判定して保存 */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json().catch(() => ({}) as Record<string, unknown>);
    const mode = body?.mode === "empty" ? "empty" : "all";
    const rows = await listTagTargets(mode);

    const updates: { id: string; tags: string[] }[] = [];
    for (const r of rows) {
      const tags = classifyByRules(r.name, r.bio);
      const cur = r.tags ?? [];
      const same =
        tags.length === cur.length && tags.every((t, i) => t === cur[i]);
      if (!same) updates.push({ id: r.id, tags });
    }
    if (updates.length > 0) {
      await setPeopleTags(updates);
    }
    return NextResponse.json({
      success: true,
      mode,
      total: rows.length,
      updated: updates.length,
    });
  } catch (e) {
    console.error("admin autotag error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
