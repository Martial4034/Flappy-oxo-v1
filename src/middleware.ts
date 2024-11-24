import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/utils/session';

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ['/', '/auth'];

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;

  // Permettre l'accès aux routes publiques
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Vérifier l'authentification
  if (!session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Définir les routes à protéger
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 