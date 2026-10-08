"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import TermsModal from "./TermsModal";

export default function TermsGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const token = Cookies.get("user_token");
    if (token) return;
    // Cookieが消えてもlocalStorageから復元（スマホ等でCookieが飛ぶ対策）
    let stored: string | null = null;
    try {
      stored = localStorage.getItem("sk_token");
    } catch {
      /* noop */
    }
    if (stored) {
      Cookies.set("user_token", stored, { expires: 365, sameSite: "strict" });
      location.reload();
      return;
    }
    setShow(true);
  }, []);

  if (!show) return null;
  return <TermsModal onAgree={() => setShow(false)} />;
}
