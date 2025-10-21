import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // ISRページのキャッシュヘッダーを強化
  if (
    request.nextUrl.pathname.startsWith('/ranking') ||
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname.startsWith('/person/')
  ) {
    response.headers.set(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=120'
    );
  }

  // 圧縮を強制
  response.headers.set('Accept-Encoding', 'gzip, deflate, br');

  return response;
}

export const config = {
  matcher: [
    '/',
    '/ranking/:path*',
    '/person/:path*',
  ],
};
