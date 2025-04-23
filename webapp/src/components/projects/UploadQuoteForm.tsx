'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation'; // För att kunna uppdatera sidan
import { contractorTypes } from '@/lib/constants'; // Importera från constants

// Zod schema för offerformuläret - Uppdaterat
const quoteSchema = z.object({
  // Flyttad ordning matchar formuläret
  quote_file: z.any()
    .refine(files => files instanceof FileList && files.length > 0, 'Du måste välja en fil.')
    .refine(files => files instanceof FileList && files?.[0]?.type === 'application/pdf', 'Endast PDF-filer är tillåtna.')
    .refine(files => files instanceof FileList && files?.[0]?.size <= 5 * 1024 * 1024, `Filen får vara max 5MB.`),
  amount: z.coerce.number({ invalid_type_error: 'Offertsumma måste vara ett giltigt nummer', required_error: 'Offertsumma måste anges' })
    .positive('Offertsumman måste vara större än 0').finite('Ogiltigt nummer'),
  contractor_type: z.enum(contractorTypes, { errorMap: () => ({ message: 'Välj en giltig entreprenörstyp' }) }),
  company_name: z.string().optional().nullable(), // Nytt fält, valfritt
  phone_number: z.string().optional().nullable(), // Nytt fält, valfritt
  email: z.string().email('Ange en giltig e-postadress') // Nytt fält, obligatorisk email
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface UploadQuoteFormProps {
  projectId: string;
}

export default function UploadQuoteForm({ projectId }: UploadQuoteFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFetchingEmail, setIsFetchingEmail] = useState(true); // Nytt state för email-hämtning
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset, // Använd reset
    formState: { errors, isSubmitting }, // Lägg till isSubmitting
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      email: '' // Initialt tomt
    }
  });

  // Hämta användarens email och uppdatera formuläret med reset
  useEffect(() => {
    let isMounted = true;
    const fetchUserEmailAndUpdateForm = async () => {
      setIsFetchingEmail(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (isMounted && user?.email) {
            // Använd reset för att uppdatera defaultValues efter hämtning
            reset({ email: user.email }); 
          }
      } catch (err) {
          console.error("Fel vid hämtning av user email:", err);
          // Hantera eventuellt fel här, visa meddelande?
      } finally {
          if (isMounted) {
            setIsFetchingEmail(false);
          }
      }
    };
    
    fetchUserEmailAndUpdateForm();
    
    return () => { isMounted = false; }; // Cleanup
    
  }, [reset]); // Lägg till reset som beroende

  const onSubmit: SubmitHandler<QuoteFormData> = async (data) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const file = data.quote_file[0];
    const sanitizedOriginalName = file.name.replace(/\s+/g, '_').replace(/\(|\)/g, '_').replace(/[^a-zA-Z0-9_\-\.]/g, '');
    const fileName = `${Date.now()}_${sanitizedOriginalName}`;
    const filePath = `${projectId}/${fileName}`;

    try {
      // 1. Ladda upp filen
      const { error: uploadError } = await supabase.storage.from('quotes').upload(filePath, file);
      if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

      // 2. Hämta användar-ID (för user_id)
      const { data: { user: submitUser }, error: submitUserError } = await supabase.auth.getUser();
      if (submitUserError) {
          console.error("Kunde inte hämta användare vid submit:", submitUserError);
          throw new Error('Kunde inte verifiera användare.');
      }
      if (!submitUser) throw new Error('Ingen användare inloggad');

      // 3. Spara metadata i databasen
      const { error: insertError } = await supabase
        .from('quotes')
        .insert({ 
          project_id: projectId,
          user_id: submitUser.id,
          contractor_type: data.contractor_type,
          amount: data.amount,
          file_path: filePath,
          file_name: file.name,
          company_name: data.company_name || null, 
          phone_number: data.phone_number || null,
          email: data.email, 
        });

      if (insertError) {
        console.error('DB Insert Error:', insertError);
        await supabase.storage.from('quotes').remove([filePath]);
        throw new Error('Kunde inte spara offertinformationen i databasen.');
      }

      setSuccessMessage('Offerten har laddats upp!');
      
      // Hämta användarinfo igen för att återställa e-postfältet korrekt
      const { data: { user: resetUser }, error: resetUserError } = await supabase.auth.getUser();
      if (resetUserError) {
          console.error("Kunde inte hämta användardata efter submit för reset:", resetUserError);
      }
      
      reset({ 
          email: resetUser?.email || '',
          quote_file: undefined, 
          amount: undefined, 
          contractor_type: undefined, 
          company_name: '',
          phone_number: ''
      }); 
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Ett oväntat fel inträffade.');
    } finally {
      setLoading(false);
    }
  };

  // Visa laddningsindikator för e-post om den hämtas
  if (isFetchingEmail) {
      return <div className="text-center p-6">Laddar användarinformation...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded shadow-md border">
      <h3 className="text-lg font-semibold border-b pb-2 mb-4">Ladda upp ny offert</h3>
      
      {/* 1. Filuppladdning (Flyttad högst upp) */}
      <div>
        <label htmlFor="quote_file" className="block text-sm font-medium text-gray-700">
            PDF-fil (max 5MB) <span className="text-red-600">*</span>
        </label>
        <input
          id="quote_file"
          type="file"
          accept=".pdf"
          {...register('quote_file')}
          className={`mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${errors.quote_file ? 'border border-red-500 rounded-md p-1' : ''}`}
         />
         {errors.quote_file?.message && typeof errors.quote_file.message === 'string' && (
             <p className="mt-1 text-sm text-red-600">{errors.quote_file.message}</p>
         )}
      </div>

      {/* 2. Offertsumma (Flyttad hit) */}
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
        {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
      </div>

      {/* 3. Entreprenörstyp (Ändrad till Select) */}
      <div>
        <label htmlFor="contractor_type" className="block text-sm font-medium text-gray-700">
            Entreprenörstyp <span className="text-red-600">*</span>
        </label>
        <select
          id="contractor_type"
          {...register('contractor_type')}
          className={`mt-1 block w-full px-3 py-2 border ${errors.contractor_type ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white`}
          defaultValue="" // Lägg till ett tomt default value
        >
            <option value="" disabled>Välj typ...</option>
            {contractorTypes.map(type => (
                <option key={type} value={type}>{type}</option>
            ))}
        </select>
        {errors.contractor_type && <p className="mt-1 text-sm text-red-600">{errors.contractor_type.message}</p>}
      </div>

      {/* 4. Företagsnamn (Nytt fält) */}
      <div>
        <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
            Företagsnamn
        </label>
        <input
          id="company_name"
          type="text"
          {...register('company_name')}
          className={`mt-1 block w-full px-3 py-2 border ${errors.company_name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        />
        {errors.company_name && <p className="mt-1 text-sm text-red-600">{errors.company_name.message}</p>}
      </div>

      {/* 5. Telefonnummer (Nytt fält) */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
            Telefonnummer
        </label>
        <input
          id="phone_number"
          type="tel" // Använd type="tel"
          {...register('phone_number')}
          className={`mt-1 block w-full px-3 py-2 border ${errors.phone_number ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
        />
        {errors.phone_number && <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>}
      </div>

      {/* 6. Email (Nytt fält, auto-ifyllt) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            E-post (kontaktperson) <span className="text-red-600">*</span>
        </label>
        <input
          id="email"
          type="email"
          {...register('email')} 
          readOnly // Behåll skrivskyddat
          className={`mt-1 block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-100 cursor-not-allowed`}
        />
        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      {successMessage && <p className="text-sm text-green-600 text-center">{successMessage}</p>}

      <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || isSubmitting || isFetchingEmail} // Inaktivera om email hämtas
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || isSubmitting ? 'Laddar upp...' : 'Ladda upp offert'}
          </button>
      </div>
    </form>
  );
} 