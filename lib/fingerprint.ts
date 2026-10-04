"use client";

/**
 * 端末フィンガープリント（cookieリセット連投対策用）。
 * サーバー側では「同一端末かどうか」の判定にのみ使い、値はメモリ内で使い捨て（保存なし・IPも保存しない）。
 * cookieを消しても UA・画面・タイムゾーン・canvas描画・GPU などは同じなので、同一端末を検出できる。
 */
let cached: Promise<string> | null = null;

/** 53bitハッシュ（cyrb53）。暗号用途ではなく重複検出用。 */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

function compute(): string {
  try {
    const parts: string[] = [
      navigator.userAgent,
      navigator.language ?? "",
      (navigator.languages ?? []).join(","),
      `${screen.width}x${screen.height}x${screen.colorDepth}@${window.devicePixelRatio}`,
      String(new Date().getTimezoneOffset()),
      (() => {
        try {
          return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
        } catch {
          return "";
        }
      })(),
      String(navigator.hardwareConcurrency ?? 0),
      String(navigator.maxTouchPoints ?? 0),
      (navigator as unknown as { platform?: string }).platform ?? "",
    ];
    // canvas描画の微妙な差異（フォントラスタライザ・GPU差）
    try {
      const c = document.createElement("canvas");
      c.width = 240;
      c.height = 60;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.fillStyle = "#f60";
        ctx.fillRect(0, 0, 80, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("ツイッタラー世論調査fp🎨", 2, 2);
        ctx.fillStyle = "rgba(102,204,0,0.7)";
        ctx.fillText("ツイッタラー世論調査fp🎨", 4, 8);
        parts.push(c.toDataURL());
      }
    } catch {
      /* canvas不可でも続行 */
    }
    // WebGLレンダラ名（端末・GPU差）
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (gl) {
        const dbg = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = dbg
          ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        parts.push(String(renderer ?? ""));
      }
    } catch {
      /* WebGL不可でも続行 */
    }
    const raw = parts.join("|");
    return `${cyrb53(raw).toString(16)}${cyrb53(raw, 7).toString(16)}${cyrb53(raw, 42).toString(16)}`;
  } catch {
    return "";
  }
}

/** 端末フィンガープリントを取得（ページ内で1回だけ計算してキャッシュ）。失敗時は空文字。 */
export function getFingerprint(): Promise<string> {
  if (!cached) cached = Promise.resolve().then(compute);
  return cached;
}
