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
  myAccessRequests: any[]; // NY: Förfrågningar gjorda av mig
  requestsForMyQuotes: any[]; // NY: Förfrågningar om mina offerter
}

// Typ för en access request (förenklad, matcha datan från page.tsx)
interface AccessRequest {
  id: string;
  quote_id: string;
  requester_user_id: string;
  uploader_user_id: string;
  status: 'pending' | 'granted' | 'denied';
  requester_email?: string; // Tillagd från join i page.tsx
}

export default function QuoteList({ 
  quotes: initialQuotes, 
  error, 
  currentUserId, 
  isAdmin, 
  myAccessRequests, // Ta emot prop
  requestsForMyQuotes // Ta emot prop
}: QuoteListProps) {

  // State för att hantera knapparnas tillstånd 
  const [requestStates, setRequestStates] = useState<Record<string, 'idle' | 'pending' | 'requested' | 'granting' | 'granted' | 'error' >>({});

  // RIKTIG funktion för att begära åtkomst
  const handleRequestAccess = async (quoteId: string) => {
    setRequestStates(prev => ({ ...prev, [quoteId]: 'pending' }));
    try {
      const { data, error } = await supabase.functions.invoke('request-quote-access', {
        body: { quoteId },
      });

      if (error) {
        throw new Error(error.message); // Kasta vidare felet
      }

      // Hantera specifika meddelanden från funktionen
      if (data?.message && data.message.includes('already pending')) {
        alert('Förfrågan är redan skickad och väntar på godkännande.');
        setRequestStates(prev => ({ ...prev, [quoteId]: 'requested' })); 
      } else if (data?.message && data.message.includes('already granted')) {
         alert('Du har redan fått åtkomst till denna offert.');
         // Uppdatera UI för att reflektera detta? Kräver ev. re-fetch/state update.
         setRequestStates(prev => ({ ...prev, [quoteId]: 'idle' })); // Eller annan state?
      } else if (data?.success) {
        console.log(`Förfrågan skickad för ${quoteId}`);
        setRequestStates(prev => ({ ...prev, [quoteId]: 'requested' }));
        // Kanske visa en toast/success-meddelande
        alert('Din förfrågan har skickats!'); 
      } else {
         // Om det inte var success men heller inget specifikt meddelande vi känner igen
         throw new Error(data?.error || 'Okänt svar från servern.');
      }

    } catch (err: any) {
      console.error("Fel vid åtkomstbegäran:", err);
      alert(`Kunde inte skicka förfrågan: ${err.message}`);
      setRequestStates(prev => ({ ...prev, [quoteId]: 'error' })); // Sätt error state
    }
  };

  // RIKTIG funktion för att godkänna åtkomst
  const handleGrantAccess = async (requestId: string) => {
    setRequestStates(prev => ({ ...prev, [requestId]: 'granting' }));
    try {
        const { data, error } = await supabase.functions.invoke('grant-quote-access', {
          body: { requestId },
        });

        if (error) {
          throw new Error(error.message);
        }

        if (data?.success) {
            console.log(`Åtkomst godkänd för ${requestId}`);
            setRequestStates(prev => ({ ...prev, [requestId]: 'granted' }));
            // HÄR: Idealiskt skulle vi uppdatera `requestsForMyQuotes` state
            // för att ta bort den godkända förfrågan från listan utan sidomladdning.
            // Enklast nu: Visa knappen som "Godkänd".
            alert('Åtkomst har beviljats!');
        } else {
             throw new Error(data?.error || 'Okänt svar från servern vid godkännande.');
        }

    } catch (err: any) {
      console.error("Fel vid godkännande:", err);
      alert(`Kunde inte godkänna åtkomst: ${err.message}`);
      setRequestStates(prev => ({ ...prev, [requestId]: 'error' })); // Sätt error state
    }
  };

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
        const isOwner = quote.user_id === currentUserId;
        
        // Kolla om jag har en godkänd förfrågan (med null/undefined check)
        const myGrantedRequest = Array.isArray(myAccessRequests)
          ? (myAccessRequests as AccessRequest[]).find(
              req => req.quote_id === quote.id && req.status === 'granted'
            )
          : undefined; // Sätt till undefined om myAccessRequests inte är en array
        
        // Kolla om jag har en väntande förfrågan (eller en i requestStates) (med null/undefined check)
        const myPendingRequest = Array.isArray(myAccessRequests)
          ? (myAccessRequests as AccessRequest[]).find(
              req => req.quote_id === quote.id && req.status === 'pending'
            )
           : undefined; // Sätt till undefined om myAccessRequests inte är en array
        
        const requestState = requestStates[quote.id] || 'idle';

        // Avgör om Ta bort-knappen ska visas (endast för admins eller ägaren)
        const canDelete = isAdmin || isOwner;
        // Avgör om användaren ska se full information 
        const canSeeFullInfo = isAdmin || isOwner || !!myGrantedRequest;

        // Hitta väntande förfrågningar för denna offert (om jag är ägare)
        const pendingRequestsForThisQuote = isOwner 
          ? (requestsForMyQuotes as AccessRequest[]).filter(req => req.quote_id === quote.id && req.status === 'pending')
          : [];

        return (
          <div key={quote.id} className="border rounded-md p-4 bg-white shadow-sm space-y-3">
            {/* --- Huvudinnehåll för Offert --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              {canSeeFullInfo ? (
                // Fullständig vy
                <>
                  <div className="flex-grow">
                    <p className="font-semibold text-base">{quote.contractor_type}</p>
                    <p className="text-sm text-gray-600">Summa: {currencyFormatter.format(quote.amount)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Uppladdad av: {isOwner ? 'Mig' : (quote.profiles?.email || 'Okänd')} den {new Date(quote.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center space-x-2">
                    <button
                      onClick={() => handleDownload(quote.file_path, quote.file_name)}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
                    >
                      Ladda ner ({quote.file_name})
                    </button>
                    {canDelete && (
                      <DeleteQuoteButton
                          quoteId={quote.id}
                          filePath={quote.file_path}
                      />
                    )}
                  </div>
                </>
              ) : (
                // Begränsad vy (inte ägare, inte admin, inte godkänd request)
                <>
                  <div className="flex-grow">
                    <p className="font-semibold text-base">{quote.contractor_type}</p>
                     <p className="text-xs text-gray-500 mt-1">
                       Uppladdad den {new Date(quote.created_at).toLocaleDateString('sv-SE')}
                     </p>
                  </div>
                  <div className="flex-shrink-0">
                    {/* Knapp för att begära access visas bara om ingen request är skickad/pending */}
                    {(!myPendingRequest && requestState !== 'requested') && (
                      <button
                        onClick={() => handleRequestAccess(quote.id)}
                        disabled={requestState === 'pending'}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {requestState === 'pending' ? 'Skickar...' : requestState === 'error' ? 'Försök igen' : 'Ta del av offert'}
                      </button>
                    )}
                    {(myPendingRequest || requestState === 'requested') && (
                       <span className="text-sm text-gray-500 italic px-3 py-1">Förfrågan skickad</span>
                    )}
                  </div>
                </>
              )}
            </div>
            
            {/* --- Sektion för att hantera förfrågningar (visas endast för ägaren) --- */}
            {isOwner && pendingRequestsForThisQuote.length > 0 && (
              <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-600">Väntande förfrågningar:</h4>
                {pendingRequestsForThisQuote.map(req => {
                  const grantRequestState = requestStates[req.id] || 'idle'; // Använd request ID som nyckel
                  return (
                    <div key={req.id} className="flex justify-between items-center text-sm">
                      <span>Förfrågan från: {req.requester_email || req.requester_user_id}</span>
                      <button
                        onClick={() => handleGrantAccess(req.id)}
                        disabled={grantRequestState === 'granting' || grantRequestState === 'granted' || grantRequestState === 'error'}
                        className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait"
                      >
                        {grantRequestState === 'granting' ? 'Godkänner...' : grantRequestState === 'granted' ? 'Godkänd' : grantRequestState === 'error' ? 'Fel, försök igen' : 'Godkänn åtkomst'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div> // Stänger key={quote.id} div
        );
      })}
    </div>
  );
} 