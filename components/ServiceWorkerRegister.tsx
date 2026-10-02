"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:") return; // 本番のみ（devで古いチャンクを掴まない）
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
