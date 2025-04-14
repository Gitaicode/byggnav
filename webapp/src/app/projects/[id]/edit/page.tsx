'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Zod schema (uppdaterat med nya fält)
const projectSchema = z.object({
  title: z.string().min(3, 'Titel måste vara minst 3 tecken').max(100, 'Titel får vara max 100 tecken'),
  description: z.string().max(500, 'Beskrivning får vara max 500 tecken').optional().nullable(),
  category: z.string().max(50, 'Kategori får vara max 50 tecken').optional().nullable(),
  status: z.string().min(1, 'Status måste anges'),
  client_name: z.string().max(100, 'Beställare får vara max 100 tecken').optional().nullable(), // Nytt fält
  tender_document_url: z.string().url('Ange en giltig URL').optional().or(z.literal('')).nullable(), // Nytt fält, tillåt tom sträng
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Definiera en standardstruktur för formuläret (uppdaterat)
const defaultFormValues: ProjectFormData = {
    title: '',
    description: '',
    category: '',
    status: 'new',
    client_name: '', // Nytt fält
    tender_document_url: '', // Nytt fält
};

export default function EditProjectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true); // För att hämta initial data
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: async (): Promise<ProjectFormData> => {
      setInitialLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          // Uppdaterad select för att inkludera nya fält
          .select('title, description, category, status, client_name, tender_document_url')
          .eq('id', projectId)
          .single();

        if (fetchError || !data) {
          throw new Error(fetchError?.message || 'Kunde inte hämta projektdata.');
        }
        setInitialLoading(false);
        // Returnera data inklusive nya fält
        return {
            title: data.title,
            description: data.description ?? '',
            category: data.category ?? '',
            status: data.status,
            client_name: data.client_name ?? '', // Nytt fält
            tender_document_url: data.tender_document_url ?? '', // Nytt fält
        };
      } catch (err: any) {
        console.error("Fetch default values error:", err);
        setError('Kunde inte ladda projektdata för redigering.');
        setInitialLoading(false);
        return defaultFormValues;
      }
    }
  });

  // Uppdaterad onSubmit för att inkludera nya fält
  const onSubmit: SubmitHandler<ProjectFormData> = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          title: data.title,
          description: data.description,
          category: data.category,
          status: data.status,
          client_name: data.client_name, // Spara nytt fält
          tender_document_url: data.tender_document_url, // Spara nytt fält
        })
        .eq('id', projectId)
        .select();

      if (updateError) {
        // Kontrollera om felet beror på RLS (t.ex. inte admin)
        if (updateError.message.includes('violates row-level security policy')) {
            throw new Error('Du har inte behörighet att redigera detta projekt.')
        } else {
            throw updateError;
        }
      }

      router.push(`/projects/${projectId}`);
      router.refresh(); 

    } catch (err: any) {
      console.error('Error updating project:', err);
      setError(err.message || 'Ett fel inträffade när projektet skulle sparas.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <p className="text-center mt-10">Laddar projektdata...</p>;
  }
  
  // Om ett fel inträffade under laddning av default data, visa det
  if (error && !Object.values(errors).some(e => e)) { // Visa bara om det inte finns formulärfel
     return <p className="text-center mt-10 text-red-600">{error}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Redigera projekt</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded shadow-md">
        {/* Titel */} 
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Projekttitel <span className="text-red-600">*</span>
          </label>
          <input id="title" type="text" {...register('title')} className={`mt-1 block w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        {/* Beskrivning */} 
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Beskrivning</label>
          <textarea id="description" rows={4} {...register('description')} className={`mt-1 block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        {/* Kategori */} 
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori</label>
          <input id="category" type="text" {...register('category')} className={`mt-1 block w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
        </div>

        {/* Beställare (Nytt fält) */}
        <div>
          <label htmlFor="client_name" className="block text-sm font-medium text-gray-700">Beställare</label>
          <input id="client_name" type="text" {...register('client_name')} className={`mt-1 block w-full px-3 py-2 border ${errors.client_name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.client_name && <p className="mt-1 text-sm text-red-600">{errors.client_name.message}</p>}
        </div>

        {/* Status */} 
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status <span className="text-red-600">*</span>
            </label>
          <select 
            id="status" 
            {...register('status')}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.status ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}
          >
            {/* Lägg till relevanta status-alternativ */}
            <option value="new">Nytt</option>
            <option value="active">Aktivt</option>
            <option value="completed">Avslutat</option>
            <option value="archived">Arkiverat</option>
          </select>
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
        </div>

        {/* Länk till förfrågningsunderlag (Nytt fält) */}
        <div>
          <label htmlFor="tender_document_url" className="block text-sm font-medium text-gray-700">Länk till förfrågningsunderlag</label>
          <input id="tender_document_url" type="url" {...register('tender_document_url')} placeholder="https://..." className={`mt-1 block w-full px-3 py-2 border ${errors.tender_document_url ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.tender_document_url && <p className="mt-1 text-sm text-red-600">{errors.tender_document_url.message}</p>}
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        {/* Knappar */} 
        <div className="flex justify-end space-x-3">
           <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" disabled={loading}>Avbryt</button>
           <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">{loading ? 'Sparar...' : 'Spara ändringar'}</button>
        </div>
      </form>
    </div>
  );
} 