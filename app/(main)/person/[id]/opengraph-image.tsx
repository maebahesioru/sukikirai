import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { getPerson, getVoteStats } from "@/lib/queries";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

let fontPromise: Promise<Buffer> | null = null;
function loadFont(): Promise<Buffer> {
  if (!fontPromise) {
    fontPromise = readFile(path.join(process.cwd(), "assets", "NotoSansJP-Bold-subset.otf"));
  }
  return fontPromise;
}

async function avatarDataUrl(url: string | null): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 2_000_000) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default async function PersonOgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPerson(decodeURIComponent(id)).catch(() => null);
  const font = await loadFont();

  const name = person?.name ?? "ツイッタラー世論調査";
  const nameSize = name.length > 30 ? 34 : name.length > 20 ? 42 : 52;

  let total = 0;
  let likePct: number | null = null;
  if (person) {
    try {
      const v = await getVoteStats(person.id);
      total = v.total;
      likePct = v.total > 0 ? Math.round(v.likePct) : null;
    } catch {
      /* 票なし扱い */
    }
  }

  const avatar = person ? await avatarDataUrl(person.avatar_url) : null;
  const initial = [...name][0] ?? "?";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0f16",
          color: "#e9edf5",
          padding: "56px 64px",
          fontFamily: "NotoJP",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              width={88}
              height={88}
              style={{ borderRadius: 999, objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: 999,
                background: "linear-gradient(135deg, #f91880, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 40,
                fontWeight: 700,
              }}
            >
              {initial}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 24 }}>
            <div style={{ fontSize: nameSize, fontWeight: 700, lineHeight: 1.15 }}>
              {truncate(name, 40)}
            </div>
            {person?.handle ? (
              <div style={{ display: "flex", fontSize: 24, color: "#8b98ad", marginTop: 6 }}>
                {`@${person.handle}`}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 44 }}>
          <div style={{ fontSize: 34, color: "#8b98ad", marginRight: 20 }}>好き率</div>
          {likePct != null ? (
            <div style={{ fontSize: 132, fontWeight: 700, color: "#f91880", lineHeight: 1 }}>
              {`${likePct}%`}
            </div>
          ) : (
            <div style={{ fontSize: 44, color: "#8b98ad" }}>まだ投票がありません</div>
          )}
          {likePct != null ? (
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 40 }}>
              <div style={{ fontSize: 32, color: "#8b5cf6", fontWeight: 700 }}>
                {`嫌い ${100 - likePct}%`}
              </div>
              <div style={{ fontSize: 24, color: "#8b98ad", marginTop: 8 }}>{`${total}票`}</div>
            </div>
          ) : null}
        </div>

        {likePct != null ? (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: 22,
              borderRadius: 11,
              overflow: "hidden",
              marginTop: 32,
              background: "#263043",
            }}
          >
            <div style={{ width: `${likePct}%`, height: "100%", background: "#f91880" }} />
            <div style={{ width: `${100 - likePct}%`, height: "100%", background: "#8b5cf6" }} />
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 700 }}>ツイッタラー世論調査</div>
          <div style={{ fontSize: 24, color: "#1d9bf0" }}>tsuittara-yoron.hikamers.app</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NotoJP", data: font, weight: 700, style: "normal" }],
    }
  );
}
