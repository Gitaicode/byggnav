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
    .select('*, client_name, tender_document_url') 
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
        <div>
          <h2 className="text-lg font-semibold mb-1">Beskrivning</h2>
          <p className="text-gray-700 whitespace-pre-wrap">
            {project.description || 'Ingen beskrivning angiven.'}
          </p>
        </div>
        
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

        {/* Grid för övrig info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm pt-4 border-t border-gray-200 mt-4">
            <div>
                <span className="font-semibold">Kategori:</span>
                <span className="ml-2 text-gray-700">{project.category || '-'}</span>
            </div>
            <div>
                <span className="font-semibold">Status:</span>
                <span className="ml-2 text-gray-700 capitalize">{project.status}</span>
            </div>
            <div>
                <span className="font-semibold">Skapad:</span>
                <span className="ml-2 text-gray-700">{new Date(project.created_at).toLocaleDateString('sv-SE')}</span>
            </div>
        </div>
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
        />

      </div>
    </div>
  );
} 