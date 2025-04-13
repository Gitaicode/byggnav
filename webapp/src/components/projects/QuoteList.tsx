'use client'; // Behövs för nedladdningslogik senare

import React, { useState } from 'react';
import { Quote } from '@/lib/types';
import { supabase } from '@/lib/supabase/client'; // Behövs för nedladdning
import DeleteQuoteButton from './DeleteQuoteButton'; // Importera nya knappen

interface QuoteListProps {
  quotes: Quote[];
  error: string | null;
  currentUserId: string; // ID för inloggad användare
  isAdmin: boolean; // Är inloggad användare admin?
}

export default function QuoteList({ quotes: initialQuotes, error, currentUserId, isAdmin }: QuoteListProps) {
  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('quotes')
        .download(filePath);

      if (downloadError) {
        throw downloadError;
      }

      // Skapa en URL för blob-datan och trigga nedladdning
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName); // Sätt originalfilnamnet
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url); // Städa upp objekt-URL

    } catch (err: any) {
      console.error('Error downloading file:', err);
      alert(`Kunde inte ladda ner filen: ${err.message}`); // Enkel felhantering
    }
  };

  if (error) {
    return <p className="text-red-500">Kunde inte ladda offerter: {error}</p>;
  }

  if (initialQuotes.length === 0) {
    return <p className="text-gray-500 italic">Inga offerter har laddats upp än.</p>;
  }

  // Formattera valuta (Svenska kronor)
  const currencyFormatter = new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
  });

  return (
    <div className="space-y-3">
      {initialQuotes.map((quote) => {
        // Avgör om Ta bort-knappen ska visas
        const canDelete = isAdmin || quote.user_id === currentUserId;
        
        return (
          <div key={quote.id} className="border rounded-md p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white shadow-sm">
            <div className="flex-grow">
              <p className="font-semibold text-base">{quote.contractor_type}</p>
              <p className="text-sm text-gray-600">Summa: {currencyFormatter.format(quote.amount)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Uppladdad av: {quote.profiles?.email || 'Okänd'} den {new Date(quote.created_at).toLocaleDateString('sv-SE')}
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center">
              <button 
                onClick={() => handleDownload(quote.file_path, quote.file_name)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
              >
                Ladda ner ({quote.file_name})
              </button>
              {/* Visa Ta bort-knapp om användaren får */}
              {canDelete && (
                <DeleteQuoteButton 
                    quoteId={quote.id} 
                    filePath={quote.file_path} 
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 