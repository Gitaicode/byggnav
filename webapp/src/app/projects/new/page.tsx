'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client'; // Använd client-klient för formulärinteraktion

// Alternativ för select-listor
const projectStatuses = ['Planering', 'Pågående', 'Färdigställt'] as const;
const clientCategories = ['Offentlig', 'Privat'] as const;

// Zod schema för validering - Utökat
const projectSchema = z.object({
  // Befintliga fält
  title: z.string().min(3, 'Titel måste vara minst 3 tecken').max(100, 'Titel får vara max 100 tecken'),
  description: z.string().max(500, 'Beskrivning får vara max 500 tecken').optional().nullable(),
  category: z.string().max(50, 'Kategori får vara max 50 tecken').optional().nullable(), // Kanske ta bort/ersätta med Projekttyp?
  
  // Nya fält
  status: z.enum(projectStatuses, { errorMap: () => ({ message: 'Välj en giltig status' }) }),
  area: z.string().max(100, 'Max 100 tecken').optional().nullable(),
  client_category: z.enum(clientCategories).optional().nullable(),
  main_contractor: z.string().max(100, 'Max 100 tecken').optional().nullable(),
  gross_floor_area: z.coerce.number().positive('Måste vara positivt').optional().nullable(), // BTA
  building_area: z.coerce.number().positive('Måste vara positivt').optional().nullable(), // Byggarea
  num_apartments: z.coerce.number().int('Måste vara heltal').positive('Måste vara positivt').optional().nullable(),
  num_floors: z.coerce.number().int('Måste vara heltal').positive('Måste vara positivt').optional().nullable(),
  num_buildings: z.coerce.number().int('Måste vara heltal').positive('Måste vara positivt').optional().nullable(),
  environmental_class: z.string().max(50, 'Max 50 tecken').optional().nullable(),
  start_date: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Ogiltigt datum' }).optional().nullable(), // Hantera date input som sträng först
  completion_date: z.string().refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Ogiltigt datum' }).optional().nullable(),
  tender_document_url: z.string().url({ message: "Ange en giltig URL" }).optional().or(z.literal('')).nullable(),
  supplementary_tender_document_url: z.string().url({ message: "Ange en giltig URL" }).optional().or(z.literal('')).nullable(),
  model_3d_url: z.string().url({ message: "Ange en giltig URL" }).optional().or(z.literal('')).nullable(),
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
    reset,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: { // Sätt default för select om nödvändigt
        status: undefined, // Eller 'Planering'?
        client_category: undefined,
    }
  });

  const onSubmit = async (data: ProjectFormData) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Ingen användare inloggad');

      // Skapa projektet i databasen - Uppdaterad med alla fält
      const { error: insertError } = await supabase
        .from('projects')
        .insert([{
            // Befintliga
            title: data.title,
            description: data.description,
            category: data.category, // Behåll eller ta bort?
            created_by: user.id,
            // Nya fält
            status: data.status,
            area: data.area,
            client_category: data.client_category,
            main_contractor: data.main_contractor,
            gross_floor_area: data.gross_floor_area,
            building_area: data.building_area,
            num_apartments: data.num_apartments,
            num_floors: data.num_floors,
            num_buildings: data.num_buildings,
            environmental_class: data.environmental_class,
            tender_document_url: data.tender_document_url || null,
            supplementary_tender_document_url: data.supplementary_tender_document_url || null,
            model_3d_url: data.model_3d_url || null,
            // Konvertera till ISO string om databasen förväntar sig timestamp/date
            // Kontrollera att data.start_date/completion_date inte är null/undefined först
            start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
            completion_date: data.completion_date ? new Date(data.completion_date).toISOString() : null,
         }]);

      if (insertError) {
        console.error('DB Insert Error:', insertError);
        throw insertError;
      }

      router.push('/');

    } catch (err: any) {
      console.error('Error creating project:', err);
      setError(err.message || 'Ett fel inträffade när projektet skulle skapas.');
    } finally {
      setLoading(false);
    }
  };

  const baseInputClasses = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const errorInputClasses = "border-red-500";
  const normalInputClasses = "border-gray-300";
  const errorMessageClasses = "mt-1 text-sm text-red-600";
  const labelClasses = "block text-sm font-medium text-gray-700";
  const requiredMark = <span className="text-red-600">*</span>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Skapa nytt projekt</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-4 sm:p-6 rounded shadow-md">
        {/* Titel (Först) */}
        <div>
          <label htmlFor="title" className={labelClasses}>Projekttitel {requiredMark}</label>
          <input id="title" type="text" {...register('title')} className={`${baseInputClasses} ${errors.title ? errorInputClasses : normalInputClasses}`} />
          {errors.title && <p className={errorMessageClasses}>{errors.title.message}</p>}
        </div>

        <hr className="my-6"/>

        {/* Detaljfält (inklusive flyttade Beskrivning/Kategori) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Flyttad Beskrivning */}
             <div className="md:col-span-2">
                <label htmlFor="description" className={labelClasses}>Beskrivning</label>
                <textarea id="description" rows={4} {...register('description')} className={`${baseInputClasses} ${errors.description ? errorInputClasses : normalInputClasses}`} />
                {errors.description && <p className={errorMessageClasses}>{errors.description.message}</p>}
             </div>
             {/* Flyttad Kategori */}
             <div>
                 <label htmlFor="category" className={labelClasses}>Kategori (t.ex. Nybyggnad, Renovering)</label>
                 <input id="category" type="text" {...register('category')} className={`${baseInputClasses} ${errors.category ? errorInputClasses : normalInputClasses}`} />
                 {errors.category && <p className={errorMessageClasses}>{errors.category.message}</p>}
             </div>
             <div>
                <label htmlFor="status" className={labelClasses}>Status {requiredMark}</label>
                <select id="status" {...register('status')} className={`${baseInputClasses} ${errors.status ? errorInputClasses : normalInputClasses} bg-white`} defaultValue="">
                    <option value="" disabled>Välj status...</option>
                    {projectStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.status && <p className={errorMessageClasses}>{errors.status.message}</p>}
            </div>
            <div>
                <label htmlFor="area" className={labelClasses}>Område</label>
                <input id="area" type="text" {...register('area')} className={`${baseInputClasses} ${errors.area ? errorInputClasses : normalInputClasses}`} />
                {errors.area && <p className={errorMessageClasses}>{errors.area.message}</p>}
            </div>
            <div>
                <label htmlFor="client_category" className={labelClasses}>Beställarkategori</label>
                <select id="client_category" {...register('client_category')} className={`${baseInputClasses} ${errors.client_category ? errorInputClasses : normalInputClasses} bg-white`} defaultValue="">
                    <option value="" disabled>Välj kategori...</option>
                    {clientCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.client_category && <p className={errorMessageClasses}>{errors.client_category.message}</p>}
            </div>
            <div>
                <label htmlFor="main_contractor" className={labelClasses}>Totalentreprenör</label>
                <input id="main_contractor" type="text" {...register('main_contractor')} className={`${baseInputClasses} ${errors.main_contractor ? errorInputClasses : normalInputClasses}`} />
                {errors.main_contractor && <p className={errorMessageClasses}>{errors.main_contractor.message}</p>}
            </div>
             <div>
                <label htmlFor="environmental_class" className={labelClasses}>Miljöklassning</label>
                <input id="environmental_class" type="text" {...register('environmental_class')} className={`${baseInputClasses} ${errors.environmental_class ? errorInputClasses : normalInputClasses}`} />
                {errors.environmental_class && <p className={errorMessageClasses}>{errors.environmental_class.message}</p>}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="gross_floor_area" className={labelClasses}>BTA (m2)</label>
                <input id="gross_floor_area" type="number" step="any" {...register('gross_floor_area')} className={`${baseInputClasses} ${errors.gross_floor_area ? errorInputClasses : normalInputClasses}`} />
                {errors.gross_floor_area && <p className={errorMessageClasses}>{errors.gross_floor_area.message}</p>}
            </div>
            <div>
                <label htmlFor="building_area" className={labelClasses}>Byggarea (m2)</label>
                <input id="building_area" type="number" step="any" {...register('building_area')} className={`${baseInputClasses} ${errors.building_area ? errorInputClasses : normalInputClasses}`} />
                {errors.building_area && <p className={errorMessageClasses}>{errors.building_area.message}</p>}
            </div>
            <div>
                <label htmlFor="num_apartments" className={labelClasses}>Antal lägenheter</label>
                <input id="num_apartments" type="number" step="1" {...register('num_apartments')} className={`${baseInputClasses} ${errors.num_apartments ? errorInputClasses : normalInputClasses}`} />
                {errors.num_apartments && <p className={errorMessageClasses}>{errors.num_apartments.message}</p>}
            </div>
            <div>
                <label htmlFor="num_floors" className={labelClasses}>Antal våningar</label>
                <input id="num_floors" type="number" step="1" {...register('num_floors')} className={`${baseInputClasses} ${errors.num_floors ? errorInputClasses : normalInputClasses}`} />
                {errors.num_floors && <p className={errorMessageClasses}>{errors.num_floors.message}</p>}
            </div>
            <div>
                <label htmlFor="num_buildings" className={labelClasses}>Antal byggnader</label>
                <input id="num_buildings" type="number" step="1" {...register('num_buildings')} className={`${baseInputClasses} ${errors.num_buildings ? errorInputClasses : normalInputClasses}`} />
                {errors.num_buildings && <p className={errorMessageClasses}>{errors.num_buildings.message}</p>}
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="start_date" className={labelClasses}>Startdatum</label>
                <input id="start_date" type="date" {...register('start_date')} className={`${baseInputClasses} ${errors.start_date ? errorInputClasses : normalInputClasses} bg-white`} />
                {errors.start_date && <p className={errorMessageClasses}>{errors.start_date.message}</p>}
            </div>
             <div>
                <label htmlFor="completion_date" className={labelClasses}>Färdigställandedatum</label>
                <input id="completion_date" type="date" {...register('completion_date')} className={`${baseInputClasses} ${errors.completion_date ? errorInputClasses : normalInputClasses} bg-white`} />
                {errors.completion_date && <p className={errorMessageClasses}>{errors.completion_date.message}</p>}
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            <div>
                <label htmlFor="tender_document_url" className={labelClasses}>Förfrågningsunderlag</label>
                <input id="tender_document_url" type="url" {...register('tender_document_url')} className={`${baseInputClasses} ${errors.tender_document_url ? errorInputClasses : normalInputClasses}`} />
                {errors.tender_document_url && <p className={errorMessageClasses}>{errors.tender_document_url.message}</p>}
            </div>
            <div>
                <label htmlFor="supplementary_tender_document_url" className={labelClasses}>Kompletterande förfrågningsunderlag</label>
                <input id="supplementary_tender_document_url" type="url" {...register('supplementary_tender_document_url')} className={`${baseInputClasses} ${errors.supplementary_tender_document_url ? errorInputClasses : normalInputClasses}`} />
                {errors.supplementary_tender_document_url && <p className={errorMessageClasses}>{errors.supplementary_tender_document_url.message}</p>}
            </div>
            <div>
                <label htmlFor="model_3d_url" className={labelClasses}>Se 3D-modell i webbläsaren</label>
                <input id="model_3d_url" type="url" {...register('model_3d_url')} className={`${baseInputClasses} ${errors.model_3d_url ? errorInputClasses : normalInputClasses}`} />
                {errors.model_3d_url && <p className={errorMessageClasses}>{errors.model_3d_url.message}</p>}
            </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center my-4">{error}</p>}

        <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>Avbryt</button>
            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Sparar...' : 'Skapa projekt'}
            </button>
        </div>
      </form>
    </div>
  );
} 