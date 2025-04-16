'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Alternativ för select-listor (Måste definieras här också)
const projectStatuses = ['Planering', 'Pågående', 'Färdigställt'] as const;
const clientCategories = ['Offentlig', 'Privat'] as const;
const projectTypes = ['bostad', 'industri', 'kontor', 'garage', 'övrigt'] as const;

// Definiera kategorier för rullgardinsmeny
const projectCategories = [
  'Bostadshus',
  'Offentlig verksamhet (Skola, Sjukhus, Idrottshall)',
  'Kommersiell byggnad (Hotell, Kontor, Affär)',
  'Industri (Lager, Fabrik, Produktionsanläggning)',
  'Teknisk anläggning (Pumpstation, Elcentral, Fjärrvärmestation)'
] as const;

// Zod schema (uppdaterat med KORREKTA fältnamn som matchar DB och nya fält)
const projectSchema = z.object({
  title: z.string().min(3, 'Titel måste vara minst 3 tecken').max(100, 'Titel får vara max 100 tecken'),
  client_name: z.string().max(100, 'Beställare får vara max 100 tecken').optional().nullable(),
  category: z.enum(projectCategories, { errorMap: () => ({ message: 'Välj en giltig kategori' }) }).optional().nullable(),
  status: z.enum(projectStatuses, { errorMap: () => ({ message: 'Välj en giltig status' }) }),
  tender_document_url: z.string().url({ message: "Ange en giltig URL" }).optional().or(z.literal('')).nullable(),
  supplementary_tender_document_url: z.string().url({ message: "Ange en giltig URL" }).optional().or(z.literal('')).nullable(),
  area: z.string().max(100, 'Område får vara max 100 tecken').optional().nullable(),
  client_category: z.enum(clientCategories).optional().nullable(),
  main_contractor: z.string().max(100, 'Totalentreprenör får vara max 100 tecken').optional().nullable(),
  project_type: z.enum(projectTypes).optional().nullable(),
  gross_floor_area: z.coerce.number().positive('Ange ett positivt tal').optional().nullable(),
  building_area: z.coerce.number().positive('Ange ett positivt tal').optional().nullable(),
  num_apartments: z.coerce.number().int('Ange ett heltal').positive('Ange ett positivt tal').optional().nullable(),
  num_floors: z.coerce.number().int('Ange ett heltal').positive('Ange ett positivt tal').optional().nullable(),
  environmental_class: z.string().max(50, 'Max 50 tecken').optional().nullable(),
  start_date: z.string().optional().nullable(),
  completion_date: z.string().optional().nullable(),
  other_project_info: z.string().max(1000, 'Max 1000 tecken').optional().nullable(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Uppdaterad default struktur med korrekta namn
const defaultFormValues: Partial<ProjectFormData> = {
    title: '',
    client_name: '',
    category: undefined,
    status: undefined,
    tender_document_url: '',
    supplementary_tender_document_url: '',
    area: '',
    client_category: undefined,
    main_contractor: '',
    project_type: undefined,
    gross_floor_area: undefined,
    building_area: undefined,
    num_apartments: undefined,
    num_floors: undefined,
    environmental_class: '',
    start_date: '',
    completion_date: '',
    other_project_info: '',
};

export default function EditProjectPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
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
          .select('*')
          .eq('id', projectId)
          .single();

        if (fetchError || !data) {
          throw new Error(fetchError?.message || 'Kunde inte hämta projektdata.');
        }
        setInitialLoading(false);
        
        const formatDateForInput = (dateString: string | null | undefined): string => {
            if (!dateString) return '';
            try {
                return new Date(dateString).toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        };

        const formData: ProjectFormData = {
            title: data.title,
            client_name: data.client_name ?? '',
            category: (projectCategories.includes(data.category) ? data.category : undefined) as typeof projectCategories[number] | undefined,
            status: (projectStatuses.includes(data.status) ? data.status : 'Planering') as typeof projectStatuses[number],
            tender_document_url: data.tender_document_url ?? '',
            supplementary_tender_document_url: data.supplementary_tender_document_url ?? '',
            area: data.area ?? '',
            client_category: (clientCategories.includes(data.client_category) ? data.client_category : undefined) as typeof clientCategories[number] | undefined,
            main_contractor: data.main_contractor ?? '',
            project_type: (projectTypes.includes(data.project_type) ? data.project_type : undefined) as typeof projectTypes[number] | undefined,
            gross_floor_area: data.gross_floor_area ?? undefined,
            building_area: data.building_area ?? undefined,
            num_apartments: data.num_apartments ?? undefined,
            num_floors: data.num_floors ?? undefined,
            environmental_class: data.environmental_class ?? '',
            start_date: formatDateForInput(data.start_date),
            completion_date: formatDateForInput(data.completion_date),
            other_project_info: data.other_project_info ?? '',
        };
        return formData;

      } catch (err: any) {
        console.error("Fetch default values error:", err);
        setError('Kunde inte ladda projektdata för redigering.');
        setInitialLoading(false);
        return defaultFormValues as ProjectFormData;
      }
    }
  });

  const onSubmit: SubmitHandler<ProjectFormData> = async (data) => {
    setLoading(true);
    setError(null);

    const updateData = {
        title: data.title,
        client_name: data.client_name || null,
        category: data.category || null,
        status: data.status,
        tender_document_url: data.tender_document_url || null,
        supplementary_tender_document_url: data.supplementary_tender_document_url || null,
        area: data.area || null,
        client_category: data.client_category || null,
        main_contractor: data.main_contractor || null,
        project_type: data.project_type || null,
        gross_floor_area: data.gross_floor_area || null,
        building_area: data.building_area || null,
        num_apartments: data.num_apartments || null,
        num_floors: data.num_floors || null,
        environmental_class: data.environmental_class || null,
        start_date: data.start_date || null,
        completion_date: data.completion_date || null,
        other_project_info: data.other_project_info || null,
    };

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select(); 

      if (updateError) {
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
  
  if (error && !Object.values(errors).some(e => e)) {
     return <p className="text-center mt-10 text-red-600">{error}</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Redigera projekt</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white p-6 rounded shadow-md">
        {/* Beställare (Nytt/Flyttat högst upp) */}
        <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-gray-700">Beställare</label>
            <input id="client_name" type="text" {...register('client_name')} className={`mt-1 block w-full px-3 py-2 border ${errors.client_name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
            {errors.client_name && <p className="mt-1 text-sm text-red-600">{errors.client_name.message}</p>}
        </div>

        {/* Titel */} 
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Projekttitel <span className="text-red-600">*</span>
          </label>
          <input id="title" type="text" {...register('title')} className={`mt-1 block w-full px-3 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        {/* Kategori */} 
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Kategori</label>
          <select
            id="category"
            {...register('category')}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.category ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white`}
            defaultValue=""
          >
            <option value="" disabled>Välj kategori...</option>
            {projectCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
        </div>

        {/* Totalentreprenör */} 
        <div>
          <label htmlFor="main_contractor" className="block text-sm font-medium text-gray-700">Totalentreprenör</label>
          <input id="main_contractor" type="text" {...register('main_contractor')} className={`mt-1 block w-full px-3 py-2 border ${errors.main_contractor ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.main_contractor && <p className="mt-1 text-sm text-red-600">{errors.main_contractor.message}</p>}
        </div>

        {/* Status */} 
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status <span className="text-red-600">*</span>
            </label>
          <select 
            id="status" 
            {...register('status')}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.status ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white`}
          >
            {projectStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>}
        </div>

        {/* Område */} 
        <div>
          <label htmlFor="area" className="block text-sm font-medium text-gray-700">Område</label>
          <input id="area" type="text" {...register('area')} className={`mt-1 block w-full px-3 py-2 border ${errors.area ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.area && <p className="mt-1 text-sm text-red-600">{errors.area.message}</p>}
        </div>

        {/* Beställarkategori */} 
        <div>
          <label htmlFor="client_category" className="block text-sm font-medium text-gray-700">Beställarkategori</label>
          <select 
            id="client_category" 
            {...register('client_category')}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.client_category ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white`}
            defaultValue=""
          >
            <option value="" disabled>Välj kategori...</option>
            {clientCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.client_category && <p className="mt-1 text-sm text-red-600">{errors.client_category.message}</p>}
        </div>

        {/* Projekttyp */} 
        <div>
          <label htmlFor="project_type" className="block text-sm font-medium text-gray-700">Projekttyp</label>
          <select 
            id="project_type" 
            {...register('project_type')}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${errors.project_type ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white`}
            defaultValue=""
          >
             <option value="" disabled>Välj typ...</option>
            {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.project_type && <p className="mt-1 text-sm text-red-600">{errors.project_type.message}</p>}
        </div>

        {/* Förfrågningsunderlag (URL) - Nytt */}
        <div>
            <label htmlFor="tender_document_url" className="block text-sm font-medium text-gray-700">Förfrågningsunderlag (URL)</label>
            <input id="tender_document_url" type="url" {...register('tender_document_url')} placeholder="https://..." className={`mt-1 block w-full px-3 py-2 border ${errors.tender_document_url ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
            {errors.tender_document_url && <p className="mt-1 text-sm text-red-600">{errors.tender_document_url.message}</p>}
        </div>

        {/* Kompletterande förfrågningsunderlag (URL) - Nytt */}
        <div>
            <label htmlFor="supplementary_tender_document_url" className="block text-sm font-medium text-gray-700">Kompletterande förfrågningsunderlag (URL)</label>
            <input id="supplementary_tender_document_url" type="url" {...register('supplementary_tender_document_url')} placeholder="https://..." className={`mt-1 block w-full px-3 py-2 border ${errors.supplementary_tender_document_url ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
            {errors.supplementary_tender_document_url && <p className="mt-1 text-sm text-red-600">{errors.supplementary_tender_document_url.message}</p>}
        </div>

        {/* BTA (m2) */} 
        <div>
          <label htmlFor="gross_floor_area" className="block text-sm font-medium text-gray-700">BTA (m2)</label>
          <input id="gross_floor_area" type="number" {...register('gross_floor_area')} className={`mt-1 block w-full px-3 py-2 border ${errors.gross_floor_area ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.gross_floor_area && <p className="mt-1 text-sm text-red-600">{errors.gross_floor_area.message}</p>}
        </div>

        {/* Byggarea (m2) */} 
        <div>
          <label htmlFor="building_area" className="block text-sm font-medium text-gray-700">Byggarea (m2)</label>
          <input id="building_area" type="number" {...register('building_area')} className={`mt-1 block w-full px-3 py-2 border ${errors.building_area ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.building_area && <p className="mt-1 text-sm text-red-600">{errors.building_area.message}</p>}
        </div>

        {/* Antal bostäder */} 
        <div>
          <label htmlFor="num_apartments" className="block text-sm font-medium text-gray-700">Antal bostäder</label>
          <input id="num_apartments" type="number" {...register('num_apartments')} className={`mt-1 block w-full px-3 py-2 border ${errors.num_apartments ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.num_apartments && <p className="mt-1 text-sm text-red-600">{errors.num_apartments.message}</p>}
        </div>

        {/* Antal våningar */} 
        <div>
          <label htmlFor="num_floors" className="block text-sm font-medium text-gray-700">Antal våningar</label>
          <input id="num_floors" type="number" {...register('num_floors')} className={`mt-1 block w-full px-3 py-2 border ${errors.num_floors ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.num_floors && <p className="mt-1 text-sm text-red-600">{errors.num_floors.message}</p>}
        </div>

        {/* Miljöklass */} 
        <div>
          <label htmlFor="environmental_class" className="block text-sm font-medium text-gray-700">Miljöklass</label>
          <input id="environmental_class" type="text" {...register('environmental_class')} className={`mt-1 block w-full px-3 py-2 border ${errors.environmental_class ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.environmental_class && <p className="mt-1 text-sm text-red-600">{errors.environmental_class.message}</p>}
        </div>

        {/* Startdatum */} 
        <div>
          <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">Startdatum</label>
          <input id="start_date" type="date" {...register('start_date')} className={`mt-1 block w-full px-3 py-2 border ${errors.start_date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.start_date && <p className="mt-1 text-sm text-red-600">{errors.start_date.message}</p>}
        </div>

        {/* Slutdatum */} 
        <div>
          <label htmlFor="completion_date" className="block text-sm font-medium text-gray-700">Slutdatum</label>
          <input id="completion_date" type="date" {...register('completion_date')} className={`mt-1 block w-full px-3 py-2 border ${errors.completion_date ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.completion_date && <p className="mt-1 text-sm text-red-600">{errors.completion_date.message}</p>}
        </div>

        {/* Övrig projektinfo (Nytt längst ned) */}
        <div>
          <label htmlFor="other_project_info" className="block text-sm font-medium text-gray-700">Övrig projektinfo</label>
          <textarea id="other_project_info" rows={4} {...register('other_project_info')} className={`mt-1 block w-full px-3 py-2 border ${errors.other_project_info ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`} />
          {errors.other_project_info && <p className="mt-1 text-sm text-red-600">{errors.other_project_info.message}</p>}
        </div>

        {/* Felmeddelande och knappar */}
        {error && <p className="text-sm text-red-600 text-center my-4">{error}</p>}

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-6">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>Avbryt</button>
          <button type="submit" disabled={loading || initialLoading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Sparar...' : 'Spara ändringar'}
          </button>
        </div>
      </form>
    </div>
  );
}