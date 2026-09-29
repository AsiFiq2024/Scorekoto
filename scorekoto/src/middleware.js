import { NextResponse } from 'next/server';

const PUBLIC_AUTH_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
];

const PUBLIC_PAGE_PATHS = [
  '/',
  '/teams',
  '/leagues',
  '/matches',
  '/news',
  '/players',
];

const PUBLIC_DATA_PATHS = [
  '/api/matches',
  '/api/teams',
  '/api/news',
  '/api/search',
  '/api/sidebar',
  '/api/notifications',
];

function matchesPath(pathname, path) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Allow public static assets and internal Next.js requests
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/sync-') || // background sync endpoints if any
    pathname.includes('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|css|js|ico)$/)
  ) {
    return NextResponse.next();
  }

  // 2. Perform a lightweight authentication check for route access.
  const tokenCookie = request.cookies.get('scorekoto_token');
  const token = tokenCookie?.value;
  const authHeader = request.headers.get('authorization');
  const hasBearerToken = authHeader && authHeader.startsWith('Bearer ');

  const isAuthenticated = Boolean(token || hasBearerToken);

  // 3. Authentication screens and endpoints remain available to signed-out users.
  if (PUBLIC_AUTH_PATHS.some((path) => matchesPath(pathname, path))) {
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 4. Guests can browse football content and use its read-only data endpoints.
  const isPublicPage = PUBLIC_PAGE_PATHS.some((path) => matchesPath(pathname, path));
  const isPublicDataRequest = request.method === 'GET'
    && PUBLIC_DATA_PATHS.some((path) => matchesPath(pathname, path));
  const isGuestCommentPost = request.method === 'POST'
    && /^\/api\/matches\/[^/]+\/comments$/.test(pathname);

  if (isPublicPage || isPublicDataRequest || isGuestCommentPost) {
    return NextResponse.next();
  }

  // 5. Keep account, favorites, admin, sync, and other private routes protected.
  if (!isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required. Please log in to proceed.' },
        { status: 401 }
      );
    }

    // If request is a page, redirect to /login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
