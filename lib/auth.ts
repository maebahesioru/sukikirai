import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "suki_admin";

function adminToken(): string {
  const pw = process.env.ADMIN_PASSWORD || "dev-admin-password";
  return createHmac("sha256", pw).update("suki-admin-v2").digest("hex");
}

export function adminCookieValue(): string {
  return adminToken();
}

/** 管理者ログイン済みか（サーバー側） */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  const v = store.get(ADMIN_COOKIE)?.value;
  if (!v) return false;
  const t = adminToken();
  if (v.length !== t.length) return false;
  try {
    return timingSafeEqual(Buffer.from(v), Buffer.from(t));
  } catch {
    return false;
  }
}

export function checkAdminPassword(password: string): boolean {
  const pw = process.env.ADMIN_PASSWORD || "dev-admin-password";
  if (typeof password !== "string" || password.length === 0) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(pw);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
