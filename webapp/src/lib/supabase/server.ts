// 'use server'; // Kan behövas beroende på kontext, men oftast inte i lib-filer

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

// Funktion för Server Components, Server Actions, Route Handlers
export const createServerActionClient = async () => {
  const cookieStore: ReadonlyRequestCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            (cookieStore as any).set({ name, value, ...options });
          } catch (error) {
            // Ignorera fel
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
             (cookieStore as any).set({ name, value: '', ...options });
          } catch (error) {
             // Ignorera fel
          }
        },
      },
    }
  );
};

// Byt namn på den gamla exporten
export { createServerActionClient as createSupabaseServerClient }; 