'use client';

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation'; // För att kunna uppdatera sidan

// Zod schema för offerformuläret
const quoteSchema = z.object({
  contractor_type: z.string().min(1, 'Entreprenörstyp måste anges').max(50, 'Max 50 tecken'),
  amount: z.coerce.number({ // Använd coerce för att konvertera från input (som är sträng)
      invalid_type_error: 'Offertsumma måste vara ett giltigt nummer',
      required_error: 'Offertsumma måste anges'
    })
    .positive('Offertsumman måste vara större än 0')
    .finite('Ogiltigt nummer'),
  quote_file: z.any() // Börja med any för SSR-kompatibilitet
    // Refine körs på klienten där FileList finns
    .refine(
      (files) => files instanceof FileList && files.length > 0, 
      'Du måste välja en fil.'
    )
    .refine(
      (files) => files instanceof FileList && files?.[0]?.type === 'application/pdf', 
      'Endast PDF-filer är tillåtna.'
    )
    .refine(
      (files) => files instanceof FileList && files?.[0]?.size <= 5 * 1024 * 1024, 
      `Filen får vara max 5MB.`
    )
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface UploadQuoteFormProps {
  projectId: string;
}

export default function UploadQuoteForm({ projectId }: UploadQuoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
  });

  const onSubmit: SubmitHandler<QuoteFormData> = async (data) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const file = data.quote_file[0];
    
    // Sanera filnamnet: ersätt mellanslag och parenteser med _, ta bort andra osäkra tecken (förenklad)
    const sanitizedOriginalName = file.name
      .replace(/\s+/g, '_') // Ersätt mellanslag med _
      .replace(/\(|\)/g, '_') // Ersätt parenteser med _
      .replace(/[^a-zA-Z0-9_\-\.]/g, ''); // Ta bort allt som inte är bokstav, siffra, _, -, .

    const fileName = `${Date.now()}_${sanitizedOriginalName}`; // Använd det sanerade namnet
    const filePath = `${projectId}/${fileName}`; // Sökväg i bucketen

    try {
      // 1. Ladda upp filen till Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('quotes') // Namnet på din bucket
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage Upload Error:', uploadError); // Behåll detaljerad loggning
        // Kasta ett fel med det specifika meddelandet från Supabase
        throw new Error(`Storage Error: ${uploadError.message}`); 
      }

      // 2. Hämta användar-ID
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) throw new Error('Ingen användare inloggad');

      // 3. Spara metadata i databasen ('quotes'-tabellen)
      const { error: insertError } = await supabase
        .from('quotes')
        .insert({
          project_id: projectId,
          user_id: user.id, // Den som laddade upp
          contractor_type: data.contractor_type,
          amount: data.amount,
          file_path: filePath, // Sökvägen från Storage
          file_name: file.name, // Originalfilnamnet
        });

      if (insertError) {
        console.error('DB Insert Error:', insertError)
        // Försök ta bort den uppladdade filen om DB-insert misslyckas?
        await supabase.storage.from('quotes').remove([filePath]);
        throw new Error('Kunde inte spara offertinformationen i databasen.');
      }

      // Allt gick bra!
      setSuccessMessage('Offerten har laddats upp!');
      reset(); // Rensa formuläret
      // Uppdatera sidan för att visa den nya offerten i listan (kräver att listan implementeras)
      router.refresh(); 

    } catch (err: any) {
      // Visa felmeddelandet som kastades (antingen från Storage eller DB)
      setError(err.message || 'Ett oväntat fel inträffade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded shadow-md border">
      <h3 className="text-lg font-semibold border-b pb-2 mb-4">Ladda upp ny offert</h3>
      
      {/* Entreprenörstyp */} 
      <div>
        <label htmlFor="contractor_type" className="block text-sm font-medium text-gray-700">
            Entreprenörstyp (t.ex. El, VS, Bygg) <span className="text-red-600">*</span>
        </label>
        <input
          id="contractor_type"
          type="text"
          {...register('contractor_type')}
          className={`mt-1 block w-full px-3 py-2 border ${errors.contractor_type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        />
        {errors.contractor_type && <p className="... text-red-600">{errors.contractor_type.message}</p>}
      </div>

      {/* Offertsumma */} 
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Offertsumma (SEK) <span className="text-red-600">*</span>
        </label>
        <input
          id="amount"
          type="number"
          step="any"
          {...register('amount')}
          className={`mt-1 block w-full px-3 py-2 border ${errors.amount ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        />
        {errors.amount && <p className="... text-red-600">{errors.amount.message}</p>}
      </div>

      {/* Filuppladdning */} 
      <div>
        <label htmlFor="quote_file" className="block text-sm font-medium text-gray-700">
            PDF-fil (max 5MB) <span className="text-red-600">*</span>
        </label>
        <input
          id="quote_file"
          type="file"
          accept=".pdf"
          {...register('quote_file')}
          className={`mt-1 block w-full text-sm text-gray-500 
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-100 file:text-blue-700
            hover:file:bg-blue-200
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${errors.quote_file ? 'border border-red-500 rounded-md p-1' : ''}`}
         />
         {/* Rendera bara felmeddelandet om det finns och är en sträng */}
         {errors.quote_file?.message && typeof errors.quote_file.message === 'string' && (
             <p className="mt-1 text-sm text-red-600">{errors.quote_file.message}</p>
         )}
      </div>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      {successMessage && <p className="text-sm text-green-600 text-center">{successMessage}</p>}

      {/* Knapp */} 
      <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Laddar upp...' : 'Ladda upp offert'}
          </button>
      </div>
    </form>
  );
} 