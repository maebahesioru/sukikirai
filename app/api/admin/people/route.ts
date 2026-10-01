import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import {
  adminCreatePerson,
  adminDeletePerson,
  adminUpdatePerson,
  getPeople,
  getPerson,
} from "@/lib/queries";
import { fetchFxUser } from "@/lib/fxtwitter";
import { normalizeHandle } from "@/lib/queries";
import { str } from "@/lib/validate";
import { CATEGORIES } from "@/lib/constants";

function sanitizeHandle(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  return normalizeHandle(v);
}

function sanitizeTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((t) => t.slice(0, 30));
}

function sanitizeCategory(v: unknown): string {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v) ? v : "その他";
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const { rows } = await getPeople({ q, includeHidden: true, includeArchived: true, perPage: 100, sort: "new" });
  return NextResponse.json({ success: true, people: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const action = str(body.action, 30);

    if (action === "create") {
      const id = str(body.id, 60).trim();
      const name = str(body.name, 100).trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "名前は必須です" }, { status: 400 });
      }
      const r = await adminCreatePerson({
        id: id || `x-user-${Date.now()}`,
        name,
        handle: sanitizeHandle(body.handle),
        description: str(body.description, 500).trim(),
        tags: sanitizeTags(body.tags),
        category: sanitizeCategory(body.category),
        avatar_url: typeof body.avatarUrl === "string" && body.avatarUrl.startsWith("http") ? body.avatarUrl.slice(0, 500) : null,
        related: sanitizeTags(body.related),
      });
      if (!r.ok) {
        return NextResponse.json({ success: false, error: r.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, person: r.person });
    }

    const id = str(body.id, 100).trim();
    if (!id) {
      return NextResponse.json({ success: false, error: "id required" }, { status: 400 });
    }

    if (action === "update") {
      const f = (body.fields ?? {}) as Record<string, unknown>;
      const fields: Parameters<typeof adminUpdatePerson>[1] = {};
      if (typeof f.name === "string") fields.name = f.name.slice(0, 100);
      if (typeof f.description === "string") fields.description = f.description.slice(0, 500);
      if ("tags" in f) fields.tags = sanitizeTags(f.tags);
      if ("category" in f) fields.category = sanitizeCategory(f.category);
      if ("handle" in f) fields.handle = sanitizeHandle(f.handle);
      if ("avatar_url" in f) {
        fields.avatar_url =
          typeof f.avatar_url === "string" && f.avatar_url.startsWith("http")
            ? f.avatar_url.slice(0, 500)
            : null;
      }
      if ("related" in f) fields.related = sanitizeTags(f.related);
      if ("is_hidden" in f) fields.is_hidden = !!f.is_hidden;
      const person = await adminUpdatePerson(id, fields);
      if (!person) {
        return NextResponse.json({ success: false, error: "人物が見つかりません" }, { status: 404 });
      }
      return NextResponse.json({ success: true, person });
    }

    if (action === "delete") {
      const ok = await adminDeletePerson(id);
      return NextResponse.json({ success: ok, error: ok ? undefined : "人物が見つかりません" });
    }

    if (action === "enrich") {
      const person = await getPerson(id);
      if (!person) {
        return NextResponse.json({ success: false, error: "人物が見つかりません" }, { status: 404 });
      }
      const candidates = [person.handle, person.id.replace(/-/g, "_"), person.id].filter(
        (c): c is string => !!c
      );
      let matched: {
        id: string;
        screenName: string;
        name: string;
        avatarUrl: string | null;
        followers: number;
      } | null = null;
      let guessed = "";
      for (const cand of candidates) {
        guessed = cand;
        const fx = await fetchFxUser(cand);
        if (fx && fx.screenName.toLowerCase() === cand.toLowerCase()) {
          matched = {
            id: fx.id,
            screenName: fx.screenName,
            name: fx.name,
            avatarUrl: fx.avatarUrl,
            followers: fx.followers,
          };
          break;
        }
      }
      if (!matched) {
        return NextResponse.json(
          {
            success: false,
            error: `Xアカウントを確認できませんでした（試したID: @${guessed}）。handle欄を手動で編集してください`,
          },
          { status: 404 }
        );
      }
      const updated = await adminUpdatePerson(id, {
        handle: matched.screenName,
        avatar_url: matched.avatarUrl,
        x_user_id: matched.id,
        x_status: "ok",
        x_checked_at: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, person: updated });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("admin people error:", e);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
