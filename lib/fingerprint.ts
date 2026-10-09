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
    // ※canvas描画・WebGLレンダラは意図的に使わない（2026-10-09変更）:
    //   Braveのfarblingやプライバシー保護・シークレットモードではセッションごとにcanvas値が変わり、
    //   「cookieリセット検出」が無効化される（実測: シークレットで別fpになり同一人物へ連投できた）。
    //   セッションで変わらない安定要素だけで構成する。
    parts.push(String((navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 0));
    parts.push(`${screen.availWidth}x${screen.availHeight}`);
    try {
      parts.push(window.matchMedia("(pointer: coarse)").matches ? "coarse" : "fine");
    } catch {
      /* 続行 */
    }
    try {
      parts.push(window.matchMedia("(hover: hover)").matches ? "hover" : "nohover");
    } catch {
      /* 続行 */
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
