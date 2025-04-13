'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface DeleteQuoteButtonProps {
  quoteId: string;
  filePath: string; // Behövs för att ta bort från Storage
}

export default function DeleteQuoteButton({ quoteId, filePath }: DeleteQuoteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setError(null);
    const confirmed = window.confirm(
      `Är du säker på att du vill ta bort denna offert? Denna åtgärd kan inte ångras.`
    );

    if (confirmed) {
      setLoading(true);
      try {
        // 1. Ta bort från databasen
        const { error: dbError } = await supabase
          .from('quotes')
          .delete()
          .eq('id', quoteId);

        if (dbError) {
            if (dbError.message.includes('violates row-level security policy')) {
                throw new Error('Du har inte behörighet att ta bort denna offert.')
            } else {
                throw dbError;
            }
        }

        // 2. Försök ta bort från Storage (ignorera fel om det inte går, DB är viktigast)
        const { error: storageError } = await supabase.storage
            .from('quotes')
            .remove([filePath]);
            
        if (storageError) {
            console.warn('Could not delete file from storage:', storageError.message);
            // Fortsätt ändå, databasposten är borta
        }
        
        // Anropa router.refresh inom startTransition för att uppdatera listan
        startTransition(() => {
            router.refresh(); 
        });

      } catch (err: any) {
        console.error('Error deleting quote:', err);
        setError(err.message || 'Kunde inte ta bort offerten.');
      } finally {
        setLoading(false);
      }
    }
  };

  const isLoading = loading || isPending;

  return (
    <button 
      onClick={handleDelete}
      disabled={isLoading}
      title="Ta bort offert"
      className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed ml-2 p-1 rounded hover:bg-red-50"
    >
      {isLoading ? 'Tar bort...' : 'Ta bort'}
      {/* Överväg att visa felmeddelande på ett annat sätt om det tar för mycket plats */}
      {/* {error && <p className="text-xs text-red-600 mt-1">{error}</p>} */}
    </button>
  );
} 