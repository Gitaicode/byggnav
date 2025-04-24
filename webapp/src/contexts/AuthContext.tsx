'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextProps {
  user: User | null;
  isAdmin: boolean;
  loadingAuth: boolean;
  session: Session | null; // Exponera session om det behövs någon annanstans
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState(true); // Starta som true
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Funktion för att hämta profil och sätta admin-status
    const fetchProfileAndSetAdmin = async (currentUser: User | null) => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      try {
        // Antag att supabase-klienten är tillgänglig här
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('[AuthProvider] Error fetching profile:', error);
          if (isMounted) setIsAdmin(false);
        } else {
          if (isMounted) setIsAdmin(profile?.is_admin ?? false);
          console.log('[AuthProvider] isAdmin set to:', profile?.is_admin ?? false);
        }
      } catch (e) {
        console.error('[AuthProvider] Exception fetching profile:', e);
        if (isMounted) setIsAdmin(false);
      }
    };

    // Hämta sessionen en gång vid start
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      
      const currentUser = initialSession?.user ?? null;
      console.log('[AuthProvider] Initial session fetched, user:', currentUser?.id);
      setSession(initialSession);
      setUser(currentUser);
      await fetchProfileAndSetAdmin(currentUser); // Hämta profil direkt
      setLoadingAuth(false); // Markera att första kollen är klar
    }).catch(error => {
         console.error('[AuthProvider] Error getting initial session:', error);
         if (isMounted) setLoadingAuth(false); // Markera klar även vid fel
    });

    // Lyssna på framtida ändringar
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;

        const newUser = currentSession?.user ?? null;
        const newSession = currentSession ?? null;

        // *** OPTIMIZATION: Only update state if user/session actually changes ***
        let userChanged = false;
        if (newUser?.id !== user?.id) {
          console.log(`[AuthProvider] User changed: ${user?.id} -> ${newUser?.id}`);
          setUser(newUser);
          setSession(newSession);
          userChanged = true;
        } else if (newSession?.access_token !== session?.access_token) {
          // Update session if token changed, but user is the same
          console.log('[AuthProvider] Session token updated for same user.');
          setSession(newSession);
          // DON'T set user again if ID is the same
        }

        console.log('[AuthProvider] Auth state changed, event:', _event, 'user:', newUser?.id);
        
        // *** OPTIMIZATION: Only fetch profile if the user actually changed ***
        if (userChanged) {
            console.log('[AuthProvider] User ID changed, fetching profile...');
            await fetchProfileAndSetAdmin(newUser);
        } else {
             console.log('[AuthProvider] User ID same or null, skipping profile fetch on this event.');
        }
        
        // Se till att loading är false efter den första sessionhämtningen
        if (loadingAuth) {
           setLoadingAuth(false);
        }
      }
    );

    // Städa upp lyssnaren när komponenten unmountas
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      console.log('[AuthProvider] Unsubscribed from auth state changes.');
    };
  }, []); // Tom dependency array säkerställer att detta bara körs en gång vid mount

  const value = { user, isAdmin, loadingAuth, session };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook för att enkelt använda contexten
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 