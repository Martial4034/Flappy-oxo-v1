import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes qui ne nécessitent pas d'authentification
const publicRoutes = ['/', '/auth'];

export async function middleware(request: NextRequest) {
  // Récupérer le token depuis les cookies
  const session = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;

  // Permettre l'accès aux routes publiques
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Vérifier l'authentification
  if (!session) {
    // Créer une URL complète pour la redirection
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclure les fichiers statiques et les routes API
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 