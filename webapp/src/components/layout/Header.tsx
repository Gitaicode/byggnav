'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Hämta initial session
    const fetchSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setLoading(false);
    };
    
    fetchSession();

    // Lyssna på ändringar i auth state (inloggning/utloggning)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Header] Auth state changed:', event);
      setSession(session);
      setLoading(false);
      
      if (event === 'SIGNED_OUT') {
          // Omdirigera endast om man inte redan är på en publik sida (t.ex. login)
          if (pathname !== '/login' && pathname !== '/register') {
            console.log('[Header] SIGNED_OUT, navigerar till /login från', pathname);
            router.push('/login');
          }
      }
    });

    // Städa upp lyssnaren när komponenten avmonteras
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // Omdirigering hanteras av onAuthStateChange-listenern
    // setLoading(false) behövs inte här direkt, då komponenten uppdateras
  };

  return (
    <header className="bg-gray-100 p-4 shadow-md sticky top-0 z-50"> {/* Gör headern sticky */}
      <div className="container mx-auto flex justify-between items-center">
        <Link href={session ? "/dashboard" : "/"} className="text-2xl font-bold text-gray-800 hover:text-blue-700">
          ByggNav
        </Link>
        <nav>
          {loading ? (
             <div className="h-6 w-20 bg-gray-300 rounded animate-pulse"></div> // Laddningsindikator för nav
          ) : session ? (
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:inline">{session.user.email}</span>
                <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  Projekt
                </Link>
                <button 
                    onClick={handleLogout}
                    className="text-sm text-red-600 hover:underline bg-red-50 px-2 py-1 rounded hover:bg-red-100"
                >
                 Logga ut
                </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Logga in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}; 