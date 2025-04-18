'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfileAndSetAdmin = async (user: User | null) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('[Header] Error fetching profile:', error);
        setIsAdmin(false);
      } else {
        setIsAdmin(profile?.is_admin ?? false);
      }
    } catch (e) {
        console.error('[Header] Exception fetching profile:', e);
        setIsAdmin(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
        try {
            const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError) throw sessionError;
            if (isMounted) {
                setSession(initialSession);
                await fetchProfileAndSetAdmin(initialSession?.user ?? null);
                setLoading(false);
            }
        } catch (error) {
            console.error("[Header] Initial fetch error:", error);
             if (isMounted) {
                setSession(null);
                setIsAdmin(false);
                setLoading(false);
            }
        }
    };
    
    fetchInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[Header] Auth state changed:', event, currentSession?.user.id);
       if (isMounted) {
            setSession(currentSession);
            await fetchProfileAndSetAdmin(currentSession?.user ?? null);
            if (loading) setLoading(false); 
            
            if (event === 'SIGNED_OUT') {
                if (pathname !== '/login' && pathname !== '/register') {
                    console.log('[Header] SIGNED_OUT, navigerar till /login från', pathname);
                    router.push('/login');
                }
            }
       }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname, loading]);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <header className="bg-gray-100 p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-gray-800 hover:text-blue-700">
          ByggNav
        </Link>
        <nav>
          {loading ? (
             <div className="h-6 w-20 bg-gray-300 rounded animate-pulse"></div>
          ) : session ? (
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:inline">{session.user.email}</span>
                {isAdmin && (
                  <Link href="/admin/registrera-email" className="text-sm text-purple-600 hover:text-purple-800 hover:underline">
                    Hantera Email
                  </Link>
                )}
                <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
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