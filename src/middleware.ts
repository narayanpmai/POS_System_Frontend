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

// Map custom full domains to their tenant slug.
// Add entries here when a store has its own custom domain.
const CUSTOM_DOMAIN_MAP: Record<string, string> = {
  'koselighar.smartptrm.com': 'koselighar',
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;

  // Get hostname of request (e.g. demo.koshelighar.com, demo.localhost:3000)
  const hostname = req.headers.get('host') || 'localhost:3000';
  // Strip port for comparison
  const hostWithoutPort = hostname.split(':')[0];

  // --- Check custom full-domain map first ---
  const customTenant = CUSTOM_DOMAIN_MAP[hostWithoutPort];
  if (customTenant) {
    url.pathname = `/sites/${customTenant}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // --- Subdomain-based routing ---
  const isLocalhost = hostname.includes('localhost');
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (isLocalhost ? 'localhost:3000' : 'koshelighar.com');

  const currentHost = hostname.replace(`.${rootDomain}`, '');

  // If there's a subdomain, rewrite the request path
  // E.g. demo.koshelighar.com/products -> /sites/demo/products
  if (currentHost !== hostname && currentHost !== 'www' && currentHost !== rootDomain) {
    url.pathname = `/sites/${currentHost}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
