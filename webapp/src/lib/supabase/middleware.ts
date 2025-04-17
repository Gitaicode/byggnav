// webapp/src/lib/supabase/middleware.ts
// Endast kod säker för Edge Runtime

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

// Funktion specifikt för Middleware
export const createMiddlewareClient = (req: NextRequest, res: NextResponse) => {
   return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Sätt cookien direkt på det inkommande respons-objektet
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          // Sätt en tom cookie direkt på det inkommande respons-objektet för att ta bort den
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );
}; 