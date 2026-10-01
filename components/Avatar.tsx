"use client";

import { useEffect, useRef, useState } from "react";

const GRADIENTS = [
  ["#f91880", "#8b5cf6"],
  ["#1d9bf0", "#8b5cf6"],
  ["#00ba7c", "#1d9bf0"],
  ["#f59e0b", "#f91880"],
  ["#8b5cf6", "#f91880"],
];

function pickGradient(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

/**
 * アバター。画像が読み込めない場合（凍結・削除などでURLが死んだ場合）は頭文字にフォールバック。
 * - onError: ハイドレーション後のエラー
 * - useEffect + complete/naturalWidth: ハイドレーション前に失敗済みのケース（イベント取りこぼし対策）
 */
export default function Avatar({
  name,
  avatarUrl,
  size = 48,
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setBroken(true);
    }
  }, [avatarUrl]);

  if (avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={imgRef}
        src={avatarUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={`rounded-full object-cover border border-line bg-panel2 shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const ch = name?.trim()?.charAt(0) ?? "?";
  const [a, b] = pickGradient(name ?? "");
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.42),
        background: `linear-gradient(135deg, ${a}, ${b})`,
      }}
    >
      {ch}
    </div>
  );
}
