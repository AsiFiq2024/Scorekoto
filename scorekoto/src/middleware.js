import { NextResponse } from 'next/server';

// Public paths that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
];

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

  // 2. Allow explicitly public paths (login, register)
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next();
  }

  // 3. Extract authentication token from Cookie or Authorization header
  const tokenCookie = request.cookies.get('scorekoto_token');
  const token = tokenCookie?.value;
  const authHeader = request.headers.get('authorization');
  const hasBearerToken = authHeader && authHeader.startsWith('Bearer ');

  const isAuthenticated = Boolean(token || hasBearerToken);

  // 4. If not authenticated:
  if (!isAuthenticated) {
    // If request is an API route, return 401 Unauthorized JSON
    if (pathname.startsWith('/api/')) {
      // Allow /api/auth/me to return { user: null } gracefully without a 401 blocker
      if (pathname === '/api/auth/me') {
        return NextResponse.next();
      }
      return NextResponse.json(
        { error: 'Authentication required. Please log in to proceed.' },
        { status: 401 }
      );
    }

    // If request is a page, redirect to /login
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // 5. If authenticated and attempting to visit /login or /register, redirect to home
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/', request.url));
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
