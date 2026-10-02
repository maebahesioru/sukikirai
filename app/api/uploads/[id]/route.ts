import { getPollUpload } from "@/lib/queries";
import { isUuid } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return new Response("not found", { status: 404 });
  }
  const row = await getPollUpload(id);
  if (!row) {
    return new Response("not found", { status: 404 });
  }
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.mime,
      "Content-Length": String(row.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
