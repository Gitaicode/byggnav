'use client';

import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { usePageReload } from '@/contexts/PageReloadContext';

export default function Header() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { triggerReload } = usePageReload();

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
    let retryCount = 0;
    const maxRetries = 3;

    const fetchInitialData = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[Header] Session fetch error:", sessionError);
          throw sessionError;
        }
        
        if (isMounted) {
          setSession(initialSession);
          
          if (initialSession?.user) {
            try {
              await fetchProfileAndSetAdmin(initialSession.user);
            } catch (profileError) {
              console.error("[Header] Profile fetch error:", profileError);
              // Fortsätt ändå men markera inte som admin
              setIsAdmin(false);
            }
          } else {
            setIsAdmin(false);
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error("[Header] Initial fetch error:", error);
        if (isMounted) {
          if (retryCount < maxRetries) {
            console.log(`[Header] Retrying fetch (${retryCount + 1}/${maxRetries})...`);
            retryCount++;
            // Använd exponentiell backoff för återförsök
            setTimeout(fetchInitialData, 1000 * Math.pow(2, retryCount));
          } else {
            console.error("[Header] Max retries reached, giving up.");
            setSession(null);
            setIsAdmin(false);
            setLoading(false);
          }
        }
      }
    };
    
    fetchInitialData();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('[Header] Auth state changed:', event, currentSession?.user?.id || 'ingen användare');
      if (isMounted) {
        setSession(currentSession);
        
        try {
          await fetchProfileAndSetAdmin(currentSession?.user ?? null);
        } catch (error) {
          console.error("[Header] Profile fetch error during auth change:", error);
          setIsAdmin(false);
        }
        
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
    if (pathname !== '/login') {
        router.push('/login');
    }
  };

  const handleHomeNavigation = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      console.log('Är på /, anropar triggerReload via context');
      triggerReload();
    } else {
      console.log('Navigerar till / via Link');
    }
  };

  return (
    <header className="bg-gray-100 p-4 shadow-md sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link 
          href="/" 
          className="text-2xl font-bold text-gray-800 hover:text-blue-700"
          onClick={handleHomeNavigation}
        >
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
                <Link 
                  href="/"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  onClick={handleHomeNavigation}
                >
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