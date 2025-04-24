'use client'; // Gör om till klientkomponent för att använda hooks

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client'; // Använd klient-klient
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quote, Profile, Project } from '@/lib/types'; // Importera typer
import Image from 'next/image'; // Importera Image
import Loading from '@/app/loading'; // Importera Loading komponenten
import { useAuth } from '@/contexts/AuthContext'; // Importera useAuth
import { AuthError } from '@supabase/supabase-js'; // Importera AuthError

// Byt namn på komponenten för att matcha filnamnet (valfritt men bra praxis)
export default function StartPage() {
  // Auth state från context
  const { user, isAdmin, loadingAuth } = useAuth(); 

  // Behåll state för projekt, laddning av projektdata, fel etc.
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true); // Byt namn från loading för tydlighet?
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usedCachedData, setUsedCachedData] = useState(false);
  const router = useRouter();

  // --- Preview states/hooks på toppnivå ---
  const [previewProjects, setPreviewProjects] = useState<Partial<Project>[]>([]);
  const [previewQuotes, setPreviewQuotes] = useState<Partial<Quote>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Cache-relaterade funktioner
  const getCachedProjects = useCallback((): Project[] | null => {
    try {
      const cachedData = localStorage.getItem('cachedProjects');
      if (!cachedData) return null;
      
      const { timestamp, projects: cachedProjects } = JSON.parse(cachedData);
      // Cache är giltig i 24 timmar
      const cacheValidMs = 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      
      if (now - timestamp > cacheValidMs) {
        console.log('Cache är för gammal, rensar och använder inte');
        localStorage.removeItem('cachedProjects');
        return null;
      }
      
      // Vi tillåter nu en tom lista från cache
      if (!cachedProjects || !Array.isArray(cachedProjects)) {
        console.log('Ogiltig cache-format');
        return null;
      }
      
      console.log('Använder cachad projektdata från', new Date(timestamp).toLocaleString());
      return cachedProjects;
    } catch (err) {
      console.error('Fel vid hämtning av cachad projektdata:', err);
      return null;
    }
  }, []);

  const saveCachedProjects = useCallback((projectData: Project[]) => {
    // Spara även tom lista för att representera ett tomt state
    try {
      const cacheData = {
        timestamp: new Date().getTime(),
        projects: projectData
      };
      localStorage.setItem('cachedProjects', JSON.stringify(cacheData));
      console.log('Projektdata sparad i cache');
    } catch (err) {
      console.error('Kunde inte spara projekt i cache:', err);
    }
  }, []);

  // --- Anpassad fetchData --- 
  const fetchData = useCallback(async () => {
    // Använder 'user' från context direkt
    console.log(`[fetchData] Körs. User from context: ${user?.id ?? 'null'}`);
    setLoadingData(true); // Använd det nya state-namnet
    setError(null);
    setUsedCachedData(false);

    if (!user) {
      console.log("[fetchData] Ingen användare i context. Visar preview/utloggat läge.");
      setProjects([]); // Nollställ projekt om användaren loggat ut
      localStorage.removeItem('cachedProjects'); // Rensa cache vid utloggning
      setLoadingData(false);
      // fetchPreviewData kommer att köras via sin egen useEffect
      return;
    }

    // Användaren är inloggad (user finns i context)
    try {
        // Profil/isAdmin hämtas nu i AuthProvider, behövs inte här
        // Om specifik profilinfo behövs utöver isAdmin, kan den hämtas här
        // const { data: profileDataResult... } = await supabase...;
        // setProfile(profileDataResult);
        
        // Försök hämta projekt
        console.log(`[fetchData] Användare ${user.id} inloggad. Försöker hämta projekt...`);
        const { data: projectDataResult, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, description, status, created_at, updated_at, category, created_by, client_name, tender_document_url, building_image_url, area, gross_floor_area, start_date')
          .order('created_at', { ascending: false });

        if (projectsError) throw projectsError;

        const projectData = projectDataResult || [];
        console.log(`[fetchData] Hämtade ${projectData.length} projekt.`);
        setProjects(projectData as Project[]);
        saveCachedProjects(projectData as Project[]);
        setRetryCount(0);
        // setHasManuallyReloaded(false); // Ta bort om manuell reload tas bort

    } catch (err: any) {
        console.error("[fetchData] Fel vid hämtning av projektdata för inloggad användare:", err);
        setError(err.message || 'Kunde inte hämta projektdata.');
        // Fallback till cache vid fel?
        const cachedProjects = getCachedProjects();
        if (cachedProjects) {
            console.warn('[fetchData] Använder cachade projekt pga fel.');
            setProjects(cachedProjects);
            setUsedCachedData(true);
        } else {
            setProjects([]); // Nollställ om ingen cache finns
        }
    } finally {
        console.log("[fetchData] Entering finally block.");
        setLoadingData(false);
    }
  // Beroende: Kör om när user-objektet från context ändras
  }, [user, getCachedProjects, saveCachedProjects]); 

  // --- Anpassad useEffect för att anropa fetchData --- 
  useEffect(() => {
    // Vänta tills AuthProvider har kollat klart auth-status
    if (loadingAuth) {
      console.log("[Main useEffect] Väntar på att AuthProvider ska bli klar...");
      return; // Gör ingenting förrän auth är klar
    }

    console.log("[Main useEffect] AuthProvider klar, anropar fetchData.");
    fetchData();

  // Beroenden: Kör när auth är klar, eller när användaren ändras
  }, [loadingAuth, user]); // Byt från fetchData till user direkt

  // --- Anpassad useEffect för preview-data --- 
  useEffect(() => {
    // Kör bara om auth är klar OCH ingen användare finns
    if (loadingAuth || user) { 
        // Om auth laddar, eller om användare finns, gör inget här.
        // Om användare finns och sen loggar ut, kommer main useEffect/fetchData hantera det.
        if (previewProjects.length > 0 || previewQuotes.length > 0) {
             // Rensa preview om användare loggar in
             console.log("[Preview useEffect] Användare finns eller auth laddar, rensar preview.");
             setPreviewProjects([]);
             setPreviewQuotes([]);
        }
        return; 
    }

    // Nu vet vi: loadingAuth är false OCH user är null
    const fetchPreviewData = async () => {
        // ... (befintlig kod för fetchPreviewData, ingen ändring behövs här) ...
         console.log("Kör fetchPreviewData..."); 
         setPreviewLoading(true); setPreviewError(null);
         try {
            console.log("Hämtar preview-projekt...");
            const { data: projectData, error: projectsError } = await supabase
             .from('projects')
             .select('id, title, category, client_name, area, gross_floor_area, start_date, tender_document_url, building_image_url')
             .limit(3);
        
           if (projectsError) {
               console.error("Fel vid hämtning av preview-projekt:", projectsError);
               throw new Error(`Projektfel: ${projectsError.message}`); 
           }
           console.log(`Hämtade ${projectData?.length ?? 0} preview-projekt.`);
           setPreviewProjects(projectData || []);

           const projectIds = (projectData || []).map(p => p.id).filter(Boolean);
           if (projectIds.length > 0) {
             console.log("Hämtar preview-offerter för projekt-IDs:", projectIds);
             const { data: quoteData, error: quotesError } = await supabase
               .from('quotes').select('id, project_id, contractor_type').in('project_id', projectIds);
            
             if (quotesError) {
               console.error("Fel vid hämtning av preview-offerter:", quotesError);
               throw new Error(`Offertfel: ${quotesError.message}`);
             }
             console.log(`Hämtade ${quoteData?.length ?? 0} preview-offerter.`);
             setPreviewQuotes(quoteData || []);
           } else {
             console.log("Inga projekt-IDs att hämta offerter för.");
             setPreviewQuotes([]);
           }
         } catch (err: any) {
            console.error("Allvarligt fel i fetchPreviewData:", err);
            setPreviewError(err.message || 'Kunde inte ladda förhandsgranskning på grund av ett oväntat fel.');
         } finally {
            console.log("fetchPreviewData finally block, sätter previewLoading till false.");
            setPreviewLoading(false);
         }
    };
    fetchPreviewData();
  // Beroenden: Kör när auth är klar eller user ändras (blir null)
  }, [loadingAuth, user]); 

  // --- Preview useMemo ---
  const offerCountByProject = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const quote of previewQuotes) {
      if (!quote.project_id || !quote.contractor_type) continue;
      if (!map[quote.project_id]) map[quote.project_id] = {};
      map[quote.project_id][quote.contractor_type] = (map[quote.project_id][quote.contractor_type] || 0) + 1;
    }
    return map;
  }, [previewQuotes]);

  // --- Renderingslogik ---
  if (loadingAuth) {
    return <Loading />; 
  }

  // Användaren är inte inloggad (auth klar, user är null), visa Preview
  if (!user) {
    return (
      <div className="bg-white min-h-screen">
        {/* Välkomstsektion */}
        <section className="text-center py-12 px-4 sm:px-6 lg:px-8">
          {/* Uppdaterad välkomsttext */}
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Välkommen till <strong>ByggNav</strong> – den digitala mötesplatsen för beställare, totalentreprenörer, konsulter och underentreprenörer. Hitta nya projekt, ladda upp din offert och skapa framtida samarbeten!
          </p>
        </section>

        {/* Process-steg */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Steg 1 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-2">1. Registrera dig</h2>
              <p className="text-gray-600">Skapa ett konto och bli en del av nätverket.</p>
            </div>
            {/* Steg 2 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-2">2. Utforska projekt</h2>
              <p className="text-gray-600">Hitta byggprojekt och nya samarbeten.</p>
            </div>
            {/* Steg 3 */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center flex flex-col items-center">
              <h2 className="text-xl font-semibold mb-2">3. Dela offert</h2>
              <p className="text-gray-600">Låt beställare ta del av din offert!</p>
            </div>
          </div>
        </section>

        {/* CTA-sektion */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
         <div className="bg-white p-8 rounded-lg shadow-md inline-block">
            <h2 className="text-2xl font-bold mb-4">Få fler projekt!</h2>
            <Link href="/register"> {/* Länkar till registrering */}
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 hover:scale-105 transition duration-150 ease-in-out">
                Bli medlem
              </button>
            </Link>
          </div>
        </section>

        {/* Projektsektion (Befintlig kod anpassad) */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
           <h2 className="text-3xl font-bold mb-8 text-center">Aktuella Projekt</h2>
           {previewLoading && <div className="text-center py-10">Laddar förhandsgranskning...</div>}
           {previewError && <div className="text-center text-red-600 py-10">Kunde inte ladda förhandsgranskning: {previewError}</div>}
           {!previewLoading && !previewError && previewProjects.length === 0 && (
             <div className="text-center text-gray-500 py-10">Inga publika projekt att visa just nu.</div>
           )}
           {!previewLoading && !previewError && previewProjects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {previewProjects.map((project) => (
                // Befintlig projektkortsstruktur (behålls oförändrad förutom ev. småjusteringar)
                <div key={project.id} className="block border rounded-lg shadow hover:shadow-md transition-shadow bg-white overflow-hidden group flex flex-col">
                  <div className="flex flex-row">
                    <div className="p-4 flex-grow flex flex-col w-1/2">
                      <h3 className="text-lg font-semibold mb-1">
                        {project.title}
                      </h3>
                      {project.area && (
                        <p className="text-sm text-gray-700 mb-1">
                          Område: <span className="text-gray-700">{project.area}</span>
                        </p>
                      )}
                      {project.client_name && (
                        <p className="text-sm text-gray-700 mb-1">
                          Beställare: <span className="text-gray-700">{project.client_name}</span>
                        </p>
                      )}
                      {project.category && (
                        <p className="text-sm text-gray-700 mb-1">
                          Kategori: <span className="text-gray-700">
                            {(() => {
                              if (project.category.startsWith('Kommersiell byggnad')) return 'Kommersiell';
                              if (project.category.startsWith('Teknisk anläggning')) return 'Teknisk';
                              return project.category;
                            })()}
                          </span>
                        </p>
                      )}
                      {project.gross_floor_area && (
                        <p className="text-sm text-gray-700 mb-1">
                          BTA: <span className="text-gray-700">{project.gross_floor_area.toLocaleString('sv-SE')} m²</span>
                        </p>
                      )}
                      {project.start_date && (
                        <p className="text-sm text-gray-700 mb-1">
                          Start: <span className="text-gray-700">{new Date(project.start_date).toLocaleDateString('sv-SE')}</span>
                        </p>
                      )}
                      {project.tender_document_url && (
                        <div className="text-sm text-gray-700 mb-1">
                          <span>FFU: </span>
                          <a
                            href={project.tender_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Länk
                          </a>
                        </div>
                      )}
                    </div>
                    {project.building_image_url && (
                      <div className="w-1/2 flex-shrink-0 relative min-h-[180px]">
                        <Image
                          src={project.building_image_url}
                          alt={`Bild för ${project.title}`}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" // Example sizes, adjust as needed
                          className="object-cover group-hover:opacity-90 transition-opacity"
                          style={{ borderRadius: 0 }} // Ensure image doesn't have round corners if container does
                          priority={previewProjects.findIndex(p => p.id === project.id) < 3} // Prioritize loading images for first few cards
                        />
                      </div>
                    )}
                    {!project.building_image_url && <div className="w-1/2 flex-shrink-0 bg-gray-200 min-h-[180px]"></div>} {/* Placeholder */}
                  </div>
                  <div className="p-4 border-t border-gray-200 bg-white"> {/* Ändrad från bg-gray-50 */}
                    <h4 className="font-semibold text-base mb-2">Offerter</h4> {/* Något mindre rubrik */}
                    {offerCountByProject[project.id!] ? (
                      /* Justera flexbox för tätare kolumner */
                      <div className="flex flex-col flex-wrap content-start items-start max-h-20 gap-x-4 overflow-hidden"> {/* Minskad max-höjd */}
                        {Object.entries(offerCountByProject[project.id!]).map(([cat, count]) => (
                          <div key={cat} className="text-sm text-gray-700 w-full"> {/* Ändrad från text-xs */}
                            {cat}: {count} st
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">Inga offerter</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
           )}
        </section>

        {/* Footer (Enkel placeholder) */}
        <footer className="text-center py-6 mt-12 border-t border-gray-200">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} ByggNav. Alla rättigheter förbehållna.</p>
        </footer>
      </div>
    );
  }

  // Nu vet vi: Auth klar, user finns. Visa inloggat läge.
  // Visa laddning för projektdata om det behövs
  if (loadingData && projects.length === 0 && !usedCachedData) {
    return <Loading />; // Eller en mindre påträngande laddningsindikator
  }

  // Felhantering för projektdata (om auth lyckades men projekt misslyckades)
  if (error && !usedCachedData) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Problem vid hämtning</h2>
          <p className="text-gray-600 mb-4">{error}</p>
        </div>
      </div>
    );
  }
  
  // Inloggad användare - Visa projektöversikten
  return (
    <div className="py-8">
      <div className="flex justify-between items-center mb-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold">Projektöversikt</h1>
        {isAdmin && (
          <Link href="/projects/new">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Skapa nytt projekt
            </button>
          </Link>
        )}
      </div>

      {/* Notis om cachad data */}
      {usedCachedData && (
        <div className="px-4 sm:px-6 lg:px-8 mb-4">
          <div className="col-span-full bg-yellow-50 border border-yellow-200 p-3 rounded-md text-sm text-yellow-800">
            <p className="flex items-center flex-wrap gap-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>Visar senast sparad data.</span>
            </p>
          </div>
        </div>
      )}

      {/* Felmeddelande om cache används */}
      {error && usedCachedData && (
        <div className="px-4 sm:px-6 lg:px-8 mb-4">
          <div className="col-span-full bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
            <p>Kunde inte hämta senaste data. Visar lagrad information. Fel: {error}</p>
          </div>
        </div>
      )}

      {/* Inga projekt */}
      {!loadingData && projects.length === 0 && !error && (
        <div className="text-center py-10 px-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 mx-4 sm:mx-6 lg:mx-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Inga projekt</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'Kom igång genom att skapa ett nytt projekt.' : 'Du har inte blivit tillagd i några projekt än, eller så finns inga projekt att visa.'}
          </p>
          {isAdmin && (
            <div className="mt-6">
              <Link href="/projects/new">
                <button type="button" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Skapa nytt projekt
                </button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Projektlistan */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 sm:px-6 lg:px-8">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block border rounded-lg shadow hover:shadow-md transition-shadow bg-white overflow-hidden group h-full flex flex-col">
              <div className="flex-grow flex">
                 <div className="p-4 flex-grow w-1/2 flex flex-col">
                    <h3 className="text-lg font-semibold mb-1 truncate" title={project.title}>{project.title}</h3>
                    {project.area && (
                       <p className="text-sm text-gray-700 mb-1 truncate" title={`Område: ${project.area}`}>
                         Område: <span className="text-gray-700">{project.area}</span>
                       </p>
                    )}
                    {project.client_name && (
                      <p className="text-sm text-gray-700 mb-1 truncate" title={`Beställare: ${project.client_name}`}>
                        Beställare: <span className="text-gray-700">{project.client_name}</span>
                      </p>
                    )}
                    {project.category && (
                      <p className="text-sm text-gray-700 mb-1 truncate" title={`Kategori: ${project.category}`}>
                        Kategori: <span className="text-gray-700">
                          {(() => { if (project.category.startsWith('Kommersiell byggnad')) return 'Kommersiell'; if (project.category.startsWith('Teknisk anläggning')) return 'Teknisk'; return project.category; })()}
                        </span>
                      </p>
                    )}
                    {project.gross_floor_area && (
                      <p className="text-sm text-gray-700 mb-1">
                        BTA: <span className="text-gray-700">{project.gross_floor_area.toLocaleString('sv-SE')} m²</span>
                      </p>
                    )}
                    {project.start_date && (
                      <p className="text-sm text-gray-700 mb-1">
                        Start: <span className="text-gray-700">{new Date(project.start_date).toLocaleDateString('sv-SE')}</span>
                      </p>
                    )}
                    {project.tender_document_url && (
                      <div className="text-sm text-gray-700 mb-1 mt-auto pt-1">
                        <a href={project.tender_document_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /> </svg>
                          <span>FFU</span>
                        </a>
                      </div>
                    )}
                 </div>
                 <div className="w-1/2 flex-shrink-0 relative min-h-[150px]">
                    {project.building_image_url ? (
                      <Image
                        src={project.building_image_url}
                        alt={`Miniatyrbild för ${project.title}`}
                        layout="fill"
                        objectFit="cover"
                        className="group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200"></div> // Placeholder
                    )}
                 </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Importera Loading-komponenten om den inte är global
// import Loading from '@/components/Loading'; // Exempel
