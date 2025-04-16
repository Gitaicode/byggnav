// Denna sida körs på servern för att hämta data
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import DeleteProjectButton from '@/components/projects/DeleteProjectButton';
import { Quote } from '@/lib/types'; // Importera Quote-typen
import QuoteList from '@/components/projects/QuoteList'; // Importera listkomponenten (skapas strax)
import { cookies } from 'next/headers'; // Importera cookies
import { PlusIcon } from '@heroicons/react/24/outline';

// Props-typ för sidan, Next.js skickar med params för dynamiska routes
interface ProjectDetailsPageProps {
  params: { id: string };
}

// Återställd signatur
export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { id } = params; // Tillbaka till denna metod
  
  // Logga cookies som är tillgängliga för Server Component (await krävs)
  const cookieStore = await cookies(); 
  // Låt TypeScript inferera typen för 'c'
  const serverCookies = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; '); 
  console.log('[Page] Cookies tillgängliga för Server Component:', serverCookies);

  const supabase = await createSupabaseServerClient();

  // Kontrollera användarsession (även om middleware finns)
  console.log('[Page] Försöker hämta session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[Page] Fel vid hämtning av session:', sessionError);
  }
  console.log('[Page] Resultat från getSession:', session ? `User ID: ${session.user.id}` : 'Ingen session hittades');

  if (!session) {
    console.log('[Page] Ingen session hittades, omdirigerar till login...');
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
  const currentUserId = session.user.id; // Hämta ID för den inloggade användaren

  // Hämta projektdata (inklusive nya fält)
  const { data: project, error } = await supabase
    .from('projects')
    // Explicit select för tydlighet och för att garantera att nya fält hämtas
    .select('*, client_name, tender_document_url, supplementary_tender_document_url') 
    .eq('id', id)
    .single();

  // Om projektet inte hittades (RLS kan också blockera om användaren inte har access)
  if (error || !project) {
    console.error('Error fetching project or project not found:', error?.message);
    notFound(); // Visar Next.js standard 404-sida
  }

  // Hämta offerter kopplade till detta projekt
  const { data: quotes, error: quotesError } = await supabase
    .from('quotes')
    .select('*, profiles(email)') // Hämta uppladdarens e-post också
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  if (quotesError) {
    // Logga felet men låt sidan renderas, felet visas i listan
    console.error("Error fetching quotes:", quotesError.message);
  }

  // Typa resultatet
  const typedQuotes: Quote[] = quotes || [];

  // ----- NYTT: Hämta åtkomstförfrågningar -----
  let myAccessRequests: any[] = [];
  let requestsForMyQuotes: any[] = [];
  const quoteIds = typedQuotes.map(q => q.id);

  if (quoteIds.length > 0) {
    // Förfrågningar gjorda AV mig för dessa offerter
    const { data: myReqData, error: myReqError } = await supabase
      .from('quote_access_requests')
      .select('*')
      .eq('requester_user_id', currentUserId)
      .in('quote_id', quoteIds);

    if (myReqError) {
      console.error("Error fetching my access requests:", myReqError.message);
      // Fortsätt ändå, men logga felet
    } else {
      myAccessRequests = myReqData || [];
    }

    // Förfrågningar gjorda AV ANDRA för offerter uppladdade AV mig
    const { data: otherReqData, error: otherReqError } = await supabase
      .from('quote_access_requests')
      .select('*, requester:requester_user_id(email)') // Hämta frågeställarens e-post
      .eq('uploader_user_id', currentUserId)
      .in('quote_id', quoteIds);
    
    if (otherReqError) {
      console.error("Error fetching requests for my quotes:", otherReqError.message);
       // Fortsätt ändå, men logga felet
    } else {
      // Korrigera typningen här baserat på select-satsen
      requestsForMyQuotes = otherReqData?.map(req => ({
          ...req,
          requester_email: req.requester?.email // Platta ut e-posten
      })) || [];
    }
  }
  // ----- SLUT: Hämta åtkomstförfrågningar -----

  return (
    <div className="max-w-4xl mx-auto">
      {/* Titel och eventuella admin-knappar (redigera/ta bort) */}
      <div className="flex justify-between items-start mb-4 gap-4">
        <h1 className="text-3xl font-bold break-words flex-grow">{project.title}</h1>
        {/* Visa knappar för admins */} 
        {isAdmin && (
            <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                <div className="flex space-x-2">
                    <Link href={`/projects/${id}/edit`}>
                        <button className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600">
                            Redigera
                        </button>
                    </Link> 
                    <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                </div>
            </div> 
        )}
      </div>

      {/* Projektinformation (uppdaterad) */}
      <div className="bg-white p-6 rounded shadow-md mb-8 space-y-4">
        {/* Visa beställare om det finns */}
        {project.client_name && (
            <div>
                 <h2 className="text-lg font-semibold mb-1">Beställare</h2>
                 <p className="text-gray-700">{project.client_name}</p>
            </div>
        )}
        
        {/* Visa länk till förfrågningsunderlag om det finns */}
        {project.tender_document_url && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Förfrågningsunderlag</h2>
            <a 
              href={project.tender_document_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
            >
              {project.tender_document_url}
            </a>
          </div>
        )}

        {/* Visa kompletterande förfrågningsunderlag om det finns */}
        {project.supplementary_tender_document_url && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Kompletterande förfrågningsunderlag</h2>
            <a 
              href={project.supplementary_tender_document_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
            >
              {project.supplementary_tender_document_url}
            </a>
          </div>
        )}

        {/* ----- Huvudgrid för de flesta fält ----- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-6 pt-4 border-t border-gray-200 mt-4 text-sm">
           {/* Flytta in och styla om befintliga och tidigare tillagda fält */}
           {project.category && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                <span className="font-semibold text-gray-700">Kategori:</span>
                <span className="text-gray-900">{project.category}</span>
              </div>
           )}
           {project.status && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                 <span className="font-semibold text-gray-700">Status:</span>
                 <span className="text-gray-900 capitalize">{project.status}</span>
              </div>
           )}
           {project.project_type && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                 <span className="font-semibold text-gray-700">Projekttyp:</span>
                 <span className="text-gray-900 capitalize">{project.project_type}</span>
              </div>
           )}
           {project.area && (
              <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                 <span className="font-semibold text-gray-700">Område:</span>
                 <span className="text-gray-900">{project.area}</span>
              </div>
            )}
           {project.environmental_class && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Miljöklassning:</span>
                     <span className="text-gray-900">{project.environmental_class}</span>
                </div>
           )}
           {project.gross_floor_area != null && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">BTA:</span>
                     <span className="text-gray-900">{project.gross_floor_area} m²</span>
                </div>
           )}
            {project.building_area != null && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Byggarea:</span>
                     <span className="text-gray-900">{project.building_area} m²</span>
                </div>
           )}
            {project.num_apartments != null && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Antal lägenheter:</span>
                     <span className="text-gray-900">{project.num_apartments}</span>
                </div>
           )}
           {project.num_floors != null && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Antal våningar:</span>
                     <span className="text-gray-900">{project.num_floors}</span>
                </div>
            )}
            {project.client_category && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Beställarkategori:</span>
                     <span className="text-gray-900">{project.client_category}</span>
                </div>
             )}
            {project.main_contractor && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Totalentreprenör:</span>
                     <span className="text-gray-900">{project.main_contractor}</span>
                </div>
            )}
        </div>

        {/* ----- Separat grid för datum ----- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-6 pt-4 border-t border-gray-200 mt-4 text-sm">
             {project.start_date && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                    <span className="font-semibold text-gray-700">Startdatum:</span>
                    <span className="text-gray-900">{new Date(project.start_date).toLocaleDateString('sv-SE')}</span>
                </div>
             )}
            {project.completion_date && (
                <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                     <span className="font-semibold text-gray-700">Färdigställandedatum:</span>
                     <span className="text-gray-900">{new Date(project.completion_date).toLocaleDateString('sv-SE')}</span>
                </div>
            )}
             {project.updated_at && (
                 <div className="grid grid-cols-[max-content_1fr] gap-x-2 items-baseline">
                    <span className="font-semibold text-gray-700">Senast ändrad:</span>
                    <span className="text-gray-900">{new Date(project.updated_at).toLocaleDateString('sv-SE')}</span>
                </div>
             )}
        </div>

        {/* ----- Övrig projektinfo (separat block) ----- */}
        {project.other_project_info && (
          <div className="pt-4 border-t border-gray-200 mt-4">
            <h2 className="text-lg font-semibold mb-1">Övrig projektinfo</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {project.other_project_info}
            </p>
          </div>
        )}

      </div>

      {/* Sektion för offerter */}
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

        {/* Skicka med currentUserId och isAdmin till QuoteList */}
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