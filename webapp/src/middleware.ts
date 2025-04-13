import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from './lib/supabase/server'; // Importera middleware-klienten

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(req, res);

  console.log('[Middleware] Körs för path:', req.nextUrl.pathname);
  
  // Försök hämta sessionen FÖRST för loggning
  const { data: { session: initialSession } } = await supabase.auth.getSession();
  console.log('[Middleware] Session före uppdatering (getSession anropas igen internt av klienten):', initialSession ? `User ID: ${initialSession.user.id}` : 'Ingen session');

  // Spara ursprungliga cookies för jämförelse (om möjligt, kan vara komplext)
  const originalCookies = req.cookies.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  console.log('[Middleware] Cookies IN:', originalCookies);

  // Kör getSession igen (detta är det viktiga anropet för att uppdatera cookies i res)
  await supabase.auth.getSession(); 

  // Logga cookies PÅ RESPONSEN (res) som ska skickas
  const responseCookies = res.cookies.getAll().map(c => `${c.name}=${c.value}`).join('; ');
  console.log('[Middleware] Cookies UT (på res):', responseCookies);

  const { pathname } = req.nextUrl;

  /* // Kommentera ut omdirigeringslogiken
  const { data: { session } } = await supabase.auth.getSession();

  // Om användaren inte är inloggad...
  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/projects') || pathname.startsWith('/admin'))) {
    console.log('[Middleware] LOGIK UTKOMMENTERAD: Skulle omdirigerat till /login från', pathname);
    // const redirectUrl = req.nextUrl.clone();
    // redirectUrl.pathname = '/login';
    // redirectUrl.searchParams.set('next', pathname); 
    // return NextResponse.redirect(redirectUrl);
  }

  // Om användaren ÄR inloggad och försöker nå login/register
  if (session && (pathname === '/login' || pathname === '/register')) {
    console.log('[Middleware] LOGIK UTKOMMENTERAD: Skulle omdirigerat till /dashboard från', pathname);
    // const redirectUrl = req.nextUrl.clone();
    // redirectUrl.pathname = '/dashboard';
    // redirectUrl.search = ''; 
    // return NextResponse.redirect(redirectUrl);
  }
  */

  console.log('[Middleware] Returnerar res för', pathname);
  // Låt alltid requesten passera
  return res;
}

// Konfiguration för vilka sökvägar middleware ska köras på
export const config = {
  matcher: [
    /*
     * Matcha alla request-sökvägar förutom de som börjar med:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)', 
  ],
}; 