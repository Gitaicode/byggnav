import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server'; // Importera server-klienten

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Om `next` finns i URL:en, använd den som omdirigeringsdestination
  const next = searchParams.get('next') ?? '/';

  if (code) {
    // Använd await när vi skapar server-klienten
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Omdirigera till startsidan eller den angivna 'next'-sidan efter lyckat byte
      return NextResponse.redirect(`${origin}${next}`);
    }
    // Logga felet om exchangeCodeForSession misslyckas
    console.error('Error exchanging code for session:', error.message);
  } else {
    console.error('No code found in callback URL');
  }

  // Omdirigera till fel-URL om något gick fel
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
} 