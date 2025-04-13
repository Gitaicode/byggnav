'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // Använd client-klient för formulärinteraktion

// Zod schema för validering
const projectSchema = z.object({
  title: z.string().min(3, 'Titel måste vara minst 3 tecken').max(100, 'Titel får vara max 100 tecken'),
  description: z.string().max(500, 'Beskrivning får vara max 500 tecken').optional(),
  category: z.string().max(50, 'Kategori får vara max 50 tecken').optional(),
  // status sätts till 'new' automatiskt i databasen
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset, // För att rensa formuläret
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
  });

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    setError(null);

    try {
      // Hämta den inloggade användarens ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ingen användare inloggad');

      // Kontrollera om användaren är admin (bör göras säkrare med RLS/server-side check)
      // För nu antar vi att endast admins kan nå denna sida (pga middleware/länkning)

      // Skapa projektet i databasen
      const { error: insertError } = await supabase
        .from('projects')
        .insert([{ 
            title: data.title,
            description: data.description,
            category: data.category,
            created_by: user.id, // Sätt skaparen
            // status sätts av default-värdet i databasen
         }]);

      if (insertError) {
        throw insertError;
      }

      // Omdirigera till dashboard efter lyckat skapande
      router.push('/dashboard');
      router.refresh(); // Säkerställ att dashboarden hämtar den nya listan
      // reset(); // Rensa formuläret - behövs ej pga omdirigering

    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Ett fel inträffade när projektet skulle skapas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Skapa nytt projekt</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 sm:p-6 rounded shadow-md">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Projekttitel <span className="text-red-600">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className={`mt-1 block w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Beskrivning
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className={`mt-1 block w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Kategori (t.ex. Nybyggnad, Renovering)
          </label>
          <input
            id="category"
            type="text"
            {...register('category')}
            className={`mt-1 block w-full px-3 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          />
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <div className="flex justify-end space-x-3">
            <button
                type="button"
                onClick={() => router.back()} // Gå tillbaka till föregående sida
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
            >
                Avbryt
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sparar...' : 'Skapa projekt'}
            </button>
        </div>
      </form>
    </div>
  );
} 