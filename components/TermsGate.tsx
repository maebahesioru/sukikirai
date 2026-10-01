"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import TermsModal from "./TermsModal";

export default function TermsGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const token = Cookies.get("user_token");
    if (!token) setShow(true);
  }, []);

  if (!show) return null;
  return <TermsModal onAgree={() => setShow(false)} />;
}
