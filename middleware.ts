import { NextRequest, NextResponse } from "next/server";

/**
 * ロケールプレフィックス付きURL（/en/... /zh-Hans/... など）を
 * 内部パスにrewriteし、リクエストヘッダ x-locale でロケールを伝える。
 * 例: /en/person/xxx → /person/xxx (x-locale: en)
 * SEO用: 各ロケールURLが個別にクロール可能になる。
 * 併せて cookie も設定し、以降のプレフィックスなしページでも言語を維持する。
 */
const LOCALE_PREFIXES = ["ja", "en", "zh-Hans", "zh-Hant", "ko", "es", "fr"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  for (const loc of LOCALE_PREFIXES) {
    if (pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)) {
      const stripped = pathname.slice(loc.length + 1) || "/";
      const url = req.nextUrl.clone();
      url.pathname = stripped;
      const headers = new Headers(req.headers);
      headers.set("x-locale", loc);
      const res = NextResponse.rewrite(url, { request: { headers } });
      res.cookies.set("locale", loc, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
      return res;
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|2ch|.*\\..*).*)"],
};
