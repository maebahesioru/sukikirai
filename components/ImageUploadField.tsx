"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

/**
 * 画像URL入力 ＋ ファイルアップロードの両対応フィールド。
 * アップロード時はブラウザ側で縮小（最大1280px・WebP）してから送る。GIFはそのまま。
 */
export default function ImageUploadField({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (f: File | null) => {
    if (!f) return;
    setErr(null);
    setBusy(true);
    try {
      const out = await prepare(f);
      const fd = new FormData();
      fd.append("file", out, out instanceof File ? f.name : "upload.webp");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || t("アップロードに失敗しました"));
      onChange(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("アップロードに失敗しました"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mut" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, 500))}
            placeholder={t("画像URL（任意・https://…）またはここにアップロード")}
            className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-line focus:outline-none focus:ring-2 focus:ring-x/60 text-xs text-mut"
          />
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="shrink-0 px-2.5 rounded-lg border border-line text-xs text-mut hover:text-txt hover:border-line2 transition flex items-center gap-1 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {busy ? t("送信中") : t("アップロード")}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {err && <p className="text-xs text-bad mt-1">{err}</p>}
      {value && (
        <div className="mt-1.5 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-20 rounded-lg border border-line object-cover bg-panel2"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-mut hover:text-bad transition"
          >
            {t("画像を外す")}
          </button>
        </div>
      )}
    </div>
  );
}

/** 縮小して送る（GIF・失敗時はそのまま） */
async function prepare(f: File): Promise<Blob> {
  if (f.type === "image/gif" || typeof createImageBitmap !== "function") return f;
  try {
    const bmp = await createImageBitmap(f);
    const max = 1280;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale >= 1 && f.size <= 400 * 1024) return f;
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    return blob ?? f;
  } catch {
    return f;
  }
}
