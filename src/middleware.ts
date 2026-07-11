import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.koshelighar.com, demo.localhost:3000)
  const hostname = req.headers.get('host') || 'localhost:3000';

  // We only want to rewrite if the request is not for the root domain or localhost
  // E.g. skip for www.koshelighar.com or koshelighar.com
  const isLocalhost = hostname.includes('localhost');
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (isLocalhost ? 'localhost:3000' : 'koshelighar.com');

  const currentHost = hostname.replace(`.${rootDomain}`, '');

  // If there's a subdomain or custom domain, rewrite the request path
  // E.g. demo.koshelighar.com/products -> /sites/demo/products
  if (currentHost !== hostname && currentHost !== 'www' && currentHost !== rootDomain) {
    url.pathname = `/sites/${currentHost}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
