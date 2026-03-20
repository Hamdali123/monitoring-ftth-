import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('ftth_auth');
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  if (pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.includes('/favicon')) {
    return NextResponse.next();
  }

  if (!authCookie) {
    // Redirect to login if not authenticated
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
