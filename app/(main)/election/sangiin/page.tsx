import { redirect } from "next/navigation";

/** 旧URL → タブに統合（2026-10-11） */
export default function SangiinRedirect() {
  redirect("/election?tab=sangiin");
}
