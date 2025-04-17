import React from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import DeleteProjectButton from '@/components/projects/DeleteProjectButton';
import QuoteList from '@/components/projects/QuoteList'; 
import { Project, Quote } from '@/lib/types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { PlusIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { cookies } from 'next/headers';

interface ProjectDetailsPageProps {
  params: { id: string };
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = params;

  const supabase = await createSupabaseServerClient();

  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
      console.error('[Page] Session error or no session:', sessionError);
      redirect(`/login?next=/projects/${id}`);
  }

  const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single();

  if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return <p>Kunde inte ladda användarprofilen.</p>;
  }
  const isAdmin = profile.is_admin;
  const currentUserId = session.user.id;

  const { data: project, error: projectFetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

  if (projectFetchError || !project) {
      console.error('Error fetching project or project not found:', projectFetchError?.message);
      notFound();
  }

  const { data: quotesData, error: quotesError } = await supabase
    .from('quotes')
    .select('*, profiles(email)')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (quotesError) {
    console.error("Error fetching quotes:", quotesError.message);
  }
  const typedQuotes: Quote[] = quotesData || [];

  let myAccessRequests: any[] = [];
  let requestsForMyQuotes: any[] = [];
  const quoteIds = typedQuotes.map((q: Quote) => q.id);
  if (quoteIds.length > 0) {
      const { data: myReqData, error: myReqError } = await supabase
          .from('quote_access_requests')
          .select('*')
          .eq('requester_user_id', currentUserId)
          .in('quote_id', quoteIds);
      if (myReqError) console.error("Error fetching my access requests:", myReqError.message);
      myAccessRequests = myReqData || [];

      const { data: otherReqData, error: otherReqError } = await supabase
          .from('quote_access_requests')
          .select('*, requester:requester_user_id(email)') 
          .eq('uploader_user_id', currentUserId)
          .in('quote_id', quoteIds);
      if (otherReqError) console.error("Error fetching requests for my quotes:", otherReqError.message);
      requestsForMyQuotes = otherReqData?.map((req: any) => ({ ...req, requester_email: req.requester?.email })) || [];
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-start mb-6 gap-4">
        <h1 className="text-3xl font-bold break-words flex-grow">{project.title}</h1>
        {isAdmin && (
          <div className="flex flex-col items-end space-y-1 flex-shrink-0">
            <div className="flex space-x-2">
              <Link href={`/projects/${id}/edit`}>
                <button className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600">Redigera</button>
              </Link>
              <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 items-start">
          <div className="space-y-3 text-sm">
              {project.client_name && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                      <span className="font-semibold text-gray-700">Beställare:</span>
                      <span className="text-gray-900">{project.client_name}</span>
                  </div>
              )}
              {project.client_category && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                      <span className="font-semibold text-gray-700">Beställarkategori:</span>
                      <span className="text-gray-900">{project.client_category}</span>
                  </div>
              )}
              {project.area && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                      <span className="font-semibold text-gray-700">Område:</span>
                      <span className="text-gray-900">{project.area}</span>
                  </div>
              )}
              {project.category && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                      <span className="font-semibold text-gray-700">Kategori:</span>
                      <span className="text-gray-900">{project.category}</span>
                  </div>
              )}
              {project.gross_floor_area != null && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                       <span className="font-semibold text-gray-700">BTA:</span>
                       <span className="text-gray-900">{project.gross_floor_area} m²</span>
                  </div>
             )}
             {project.start_date && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                      <span className="font-semibold text-gray-700">Startdatum:</span>
                      <span className="text-gray-900">{new Date(project.start_date).toLocaleDateString('sv-SE')}</span>
                  </div>
             )}
              {project.completion_date && (
                  <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                       <span className="font-semibold text-gray-700">Färdigdatum:</span>
                       <span className="text-gray-900">{new Date(project.completion_date).toLocaleDateString('sv-SE')}</span>
                  </div>
              )}
          </div>

          <div>
              {project.building_image_url && (
                  <div className="relative w-full h-full min-h-[200px]">
                      <Image 
                          src={project.building_image_url}
                          alt={`Bild för projekt ${project.title}`}
                          layout="fill" 
                          objectFit="cover"
                          className="rounded-md shadow-md"
                          priority
                      />
                  </div>
              )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-200">
          <div>
            {project.environmental_class && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Miljöklassning:</span>
                <span className="text-gray-900">{project.environmental_class}</span>
              </div>
            )}
            {project.main_contractor && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Totalentreprenör:</span>
                <span className="text-gray-900">{project.main_contractor}</span>
              </div>
            )}
            {project.status && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Status:</span>
                <span className="text-gray-900 capitalize">{project.status}</span>
              </div>
            )}
          </div>
          
          <div>
            {project.num_apartments != null && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Antal lägenheter:</span>
                <span className="text-gray-900">{project.num_apartments}</span>
              </div>
            )}
            {project.num_floors != null && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Antal våningar:</span>
                <span className="text-gray-900">{project.num_floors}</span>
              </div>
            )}
            {project.num_buildings != null && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Antal byggnader:</span>
                <span className="text-gray-900">{project.num_buildings}</span>
              </div>
            )}
          </div>
          
          <div>
            {project.building_area != null && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Byggarea:</span>
                <span className="text-gray-900">{project.building_area} m²</span>
              </div>
            )}
            {project.other_project_info && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Övrig info:</span>
                <span className="text-gray-900">{project.other_project_info}</span>
              </div>
            )}
            {project.updated_at && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline mb-3 text-sm">
                <span className="font-semibold text-gray-700">Senast ändrad:</span>
                <span className="text-gray-900">{new Date(project.updated_at).toLocaleDateString('sv-SE')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
          {project.tender_document_url && (
            <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline text-sm">
              <span className="font-semibold text-gray-700">Förfrågningsunderlag:</span>
              <a href={project.tender_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">Länk (klickbar)</a>
            </div>
          )}
          {project.supplementary_tender_document_url && (
            <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline text-sm">
              <span className="font-semibold text-gray-700">Kompletterande förfrågningsunderlag:</span>
              <a href={project.supplementary_tender_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">Länk (klickbar)</a>
            </div>
          )}
          {project.model_3d_url && (
            <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline text-sm">
              <span className="font-semibold text-gray-700">Se 3D-modell i webbläsaren:</span>
              <a href={project.model_3d_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">Länk (klickbar)</a>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Offerter</h2>
          <Link href={`/projects/${id}/quotes/new`}>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
              <PlusIcon className="h-5 w-5 mr-1" />
              Ladda upp ny offert
            </button>
          </Link>
        </div>

        <QuoteList 
            quotes={typedQuotes}
            error={quotesError?.message || null}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            myAccessRequests={myAccessRequests}
            requestsForMyQuotes={requestsForMyQuotes}
        />
      </div>
    </div>
  );
} 