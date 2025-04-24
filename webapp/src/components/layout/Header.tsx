'use client';

import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, isAdmin, loadingAuth, session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    if (pathname !== '/login') {
        router.push('/login');
    }
  };

  const handleHomeNavigation = (e: React.MouseEvent) => {
    if (pathname === '/') {
      console.log('Navigerar till / (är redan där, låter Link fungera)');
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
          {loadingAuth ? (
             <div className="h-6 w-20 bg-gray-300 rounded animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
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