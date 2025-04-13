import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

// Skapa en Supabase-klient för användning i webbläsaren (Client Components)
// Denna klient hanterar automatiskt cookie-lagring som krävs för SSR/RSC.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Ingen server-side klient behövs här, den finns i server.ts 