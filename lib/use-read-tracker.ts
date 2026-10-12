"use client";

import { useEffect, useState } from "react";

/**
 * 既読管理（2026-10-12）: 前回訪問時の最新レス番号を返す。
 * マウント時に保存済みの旧値を読み、最新値を保存する（次回訪問用）。
 */
export function useReadTracker(storageKey: string, latest: number): number {
  const [prevRead, setPrevRead] = useState(0);
  useEffect(() => {
    if (!latest) return;
    let old = 0;
    try {
      old = parseInt(localStorage.getItem(storageKey) ?? "0", 10) || 0;
      if (latest > old) localStorage.setItem(storageKey, String(latest));
    } catch {
      /* noop */
    }
    setPrevRead(old);
  }, [storageKey, latest]);
  return prevRead;
}
