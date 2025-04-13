'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface DeleteProjectButtonProps {
  projectId: string;
  projectTitle: string;
}

export default function DeleteProjectButton({ projectId, projectTitle }: DeleteProjectButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition(); // För mjukare navigering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    const confirmed = window.confirm(
      `Är du säker på att du vill ta bort projektet "${projectTitle}"? Denna åtgärd kan inte ångras.`
    );

    if (confirmed) {
      setLoading(true);
      try {
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (deleteError) {
           if (deleteError.message.includes('violates row-level security policy')) {
                throw new Error('Du har inte behörighet att ta bort detta projekt.')
            } else {
                throw deleteError;
            }
        }

        // Använd useTransition för att omdirigera efter lyckad borttagning
        startTransition(() => {
          router.push('/dashboard'); // Gå till dashboarden
          router.refresh(); // Uppdatera dashboarden
        });

      } catch (err: any) {
        console.error('Error deleting project:', err);
        setError(err.message || 'Ett fel inträffade när projektet skulle tas bort.');
        setLoading(false);
      } 
      // setLoading(false) behövs inte här om omdirigering sker
    }
  };

  const isLoading = loading || isPending;

  return (
    <>
      <button 
        onClick={handleDelete}
        disabled={isLoading}
        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Tar bort...' : 'Ta bort'}
      </button>
      {/* Visa felmeddelandet under knappen */}
      {error && <p className="text-xs text-red-600 mt-1 text-right">{error}</p>}
    </>
  );
} 