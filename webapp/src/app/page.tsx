'use client'; // Gör om till klientkomponent för att använda hooks

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client'; // Använd klient-klient
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quote, Profile, Project } from '@/lib/types'; // Importera typer
import Image from 'next/image'; // Importera Image
import Loading from '@/app/loading'; // Importera Loading komponenten
import { usePageReload } from '@/contexts/PageReloadContext'; // Importera context hook
import { AuthError } from '@supabase/supabase-js'; // Importera AuthError

// Byt namn på komponenten för att matcha filnamnet (valfritt men bra praxis)
export default function StartPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hasManuallyReloaded, setHasManuallyReloaded] = useState(false);
  const [usedCachedData, setUsedCachedData] = useState(false);
  const router = useRouter();
  const { reloadTrigger } = usePageReload(); // Hämta reloadTrigger från context

  // --- Ref för att spåra fetchData-instansen ---
  const fetchDataRef = useRef<typeof fetchData | null>(null); // Initiera med null eller en initial funktion

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

  // Funktion för manuell omladdning (kan anropas från felmeddelande)
  const handleManualReload = useCallback(() => {
    console.log('Manuell omladdning initierad (handleManualReload)');
    setLoading(true);
    setError(null);
    setRetryCount(0);
    setHasManuallyReloaded(true);
    setUsedCachedData(false);
    // fetchData kommer att köras via useEffect när hasManuallyReloaded ändras
  }, []);

  // Datahämtningsfunktion
  const fetchData = useCallback(async (isTriggeredByReload = false) => {
    // Logga om anropet kom från context-triggern
    console.log(`fetchData körs (retry: ${retryCount}, manuell: ${hasManuallyReloaded}, contextTrigger: ${isTriggeredByReload})`);
    setLoading(true);
    setError(null);
    // Återställ bara usedCachedData om det *inte* är en manuell reload (som kan vara avsiktlig på cachad data)
    // och om det *inte* är en trigger-reload (då vi vill ha färsk data)
    if (!hasManuallyReloaded && !isTriggeredByReload) {
      setUsedCachedData(false);
    }

    try {
      // 1. Get User
      console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Attempting supabase.auth.getUser()...`);
      const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
      console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] getUser() completed. Error:`, getUserError, "User:", currentUser);

      if (getUserError) {
        console.error("[fetchData] Supabase getUser error:", getUserError);
        if (!currentUser) {
            console.log("[fetchData] getUser error but no user, treating as logged out.");
            setUser(null); setProfile(null); setProjects([]);
            localStorage.removeItem('cachedProjects');
            setUsedCachedData(false);
            // Don't set error here, let the !user block handle rendering
            // setLoading(false); // Let finally handle this
            return;
        } else {
            console.error("[fetchData] Supabase getUser error (unexpected, user exists?):", getUserError);
            setError('Kunde inte verifiera din session. Försök igen senare.');
            setUser(null); setProfile(null); setProjects([]);
            localStorage.removeItem('cachedProjects');
            setUsedCachedData(false);
            // setLoading(false); // Let finally handle this
            return;
        }
      }

      if (!currentUser) {
        console.warn("[fetchData] getUser succeeded but returned null user, treating as logged out.");
        setUser(null); setProfile(null); setProjects([]);
        // setLoading(false); // Let finally handle this
        return;
      }
      
      // Valid user found
      setUser(currentUser);

      // 2. Get Profile
      let fetchedProfileData: Profile | null = null;
      try {
        console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Attempting to fetch profile for user: ${currentUser.id}`);
        const { data: profileDataResult, error: profileError } = await supabase
          .from('profiles').select('id, is_admin').eq('id', currentUser.id).single(); // Använd currentUser
        if (profileError) throw profileError;
        if (!profileDataResult) throw new Error('Kunde inte hitta användarprofil.');
        fetchedProfileData = profileDataResult;
        setProfile(fetchedProfileData);
        console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Profile fetched successfully:`, fetchedProfileData);
      } catch (profileErr: any) {
        console.error("[fetchData] Fel vid hämtning av profil:", profileErr);
        const cachedProjects = getCachedProjects();
        if (cachedProjects && !isTriggeredByReload) { // Använd inte cache vid triggerReload
          console.warn('Profilhämtning misslyckades, använder cachade projekt.');
          setProjects(cachedProjects); setUsedCachedData(true); setLoading(false);
          return; 
        } else {
          throw new Error(profileErr.message || 'Kunde inte hämta profil.');
        }
      }
      
      // 3. Get Projects
      try {
        console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Attempting to fetch projects...`);
        const { data: projectDataResult, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, description, status, created_at, updated_at, category, created_by, client_name, tender_document_url, building_image_url, area, gross_floor_area, start_date')
          .order('created_at', { ascending: false });
        
        if (projectsError) throw projectsError;
        
        const projectData = projectDataResult || []; // Säkerställ att det är en array

        if (projectData.length === 0) {
          console.warn("Projekthämtning gav tomt resultat (0 projekt).");
          const cachedProjects = getCachedProjects();
          if (cachedProjects && !isTriggeredByReload && !hasManuallyReloaded) {
            console.log('Använder cachad projektdata pga tomt svar (ej manuell/trigger reload).');
            setProjects(cachedProjects); setUsedCachedData(true); setLoading(false);
            return;
          } else if (retryCount < 2 && !hasManuallyReloaded && !isTriggeredByReload) {
            console.log(`Tomt svar, försöker igen automatiskt (${retryCount + 1}/2)...`);
            setRetryCount(prev => prev + 1);
            setLoading(false); 
            return;
          } else {
             console.log('Visar tom projektlista efter retries/manuell/trigger reload.');
             setProjects([]); saveCachedProjects([]); setRetryCount(0);
          }
        } else {
          console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Projects fetched successfully. Count: ${projectData.length}`);
          setProjects(projectData as Project[]); saveCachedProjects(projectData as Project[]);
          setRetryCount(0); setHasManuallyReloaded(false);
        }
        
      } catch (projectErr: any) {
         // ... (samma felhantering som förut, ev. fallback till cache) ...
        console.error("Fel vid hämtning av projekt:", projectErr);
        const cachedProjects = getCachedProjects();
        if (cachedProjects && !isTriggeredByReload) { // Använd inte cache vid triggerReload
          console.warn('Projekthämtning misslyckades, använder cachade projekt.');
          setProjects(cachedProjects); setUsedCachedData(true); setLoading(false);
          return;
        } else {
          console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Attempting to fetch projects after profile error...`);
          throw new Error(projectErr.message || 'Kunde inte hämta projekt.');
        }
      }
      
    } catch (err: any) {
      console.error(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Caught error in main try block:`, err);
      if (!error && !(err.message.includes('session') || err.message.includes('logga in'))) {
            setError(err.message || 'Ett oväntat fel uppstod.');
      }
      const cachedProjects = getCachedProjects();
      if (cachedProjects && !isTriggeredByReload) { // Använd inte cache vid triggerReload
        console.warn('Generellt fel, använder cachade projekt.');
        setProjects(cachedProjects); setUsedCachedData(true);
      } else {
        // Om sessionen försvann fångas det tidigare, annars nollställ om ingen cache
        if (!error?.includes('session')) { // Undvik dubbel nollställning
            setUser(null); setProfile(null); setProjects([]);
        }
      }
    } finally {
      // *** Anpassad logg i finally ***
      console.log(`[fetchData ${isTriggeredByReload ? 'RELOAD' : 'INITIAL'}] Entering finally block. Setting loading to false.`);
      setLoading(false);
    }
  }, [retryCount, hasManuallyReloaded]); // Korrigerad beroendelista

  // Effekt för att trigga datahämtning vid montering OCH vid context-trigger
  useEffect(() => {
    // *** Lägg till loggning för att spåra fetchData-instans ***
    if (fetchDataRef.current && fetchDataRef.current !== fetchData) {
      console.log('!!! Huvud-useEffect: fetchData function instance HAR ÄNDRATS!');
    } else if (!fetchDataRef.current) {
      console.log('--- Huvud-useEffect: fetchData ref initieras.');
    } else {
      console.log('--- Huvud-useEffect: fetchData function instance är STABIL.');
    }
    fetchDataRef.current = fetchData; // Uppdatera refen

    console.log(`Huvud-useEffect körs. reloadTrigger: ${reloadTrigger}`);
    // Anropa fetchData och skicka med info om det var triggern som orsakade det
    // Vi kollar om reloadTrigger är > 0 för att veta om det är en *ny* trigger
    // (antar att initialt värde är 0)
    const isTriggered = reloadTrigger > 0; 
    
    // Nollställ state om det är en trigger-reload för att tvinga fram uppdatering
    if (isTriggered) {
        console.log('Context reload trigger detekterad, nollställer state före fetch.');
        setLoading(true); // Visa laddning direkt
        setError(null);
        setRetryCount(0);
        setHasManuallyReloaded(false);
        setUsedCachedData(false);
        setProjects([]); // Rensa projektlistan för att säkerställa visuell uppdatering
    }

    fetchData(isTriggered);

  }, [reloadTrigger, fetchData]); // Lägg till fetchData som beroende här

  // Effekt för preview-data (när utloggad)
  useEffect(() => {
    if (user !== null || loading) return; 

    const fetchPreviewData = async () => {
      console.log("Kör fetchPreviewData..."); // Logga start
      setPreviewLoading(true); setPreviewError(null);
      try {
        console.log("Hämtar preview-projekt...");
        const { data: projectData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, category, client_name, area, gross_floor_area, start_date, tender_document_url, building_image_url')
          .limit(3);
        
        // Logga specifikt projekt-felet
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
            
          // Logga specifikt offert-felet
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
        // Förbättrad loggning i catch
        console.error("Allvarligt fel i fetchPreviewData:", err);
        setPreviewError(err.message || 'Kunde inte ladda förhandsgranskning på grund av ett oväntat fel.');
      } finally {
        console.log("fetchPreviewData finally block, sätter previewLoading till false.");
        setPreviewLoading(false);
      }
    };
    fetchPreviewData();
  }, [user, loading]); // Beroenden är korrekta

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
  if (loading && projects.length === 0 && !usedCachedData) {
    // Visa fullständig laddningsindikator endast om vi inte har något alls att visa
    return <Loading />; // Antag att Loading komponenten finns globalt eller importeras
  }

  // Felhantering (behåll den förbättrade från tidigare)
  if (error && !usedCachedData) {
    const isSessionError = error.toLowerCase().includes('session') || error.toLowerCase().includes('logga in');
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center">
        <div className="bg-white p-6 rounded-lg shadow-md text-center max-w-md">
          {/* Felikon och text */}
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">{isSessionError ? 'Sessionsproblem' : 'Problem vid hämtning'}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {!isSessionError && (
              <button 
                onClick={handleManualReload} 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                disabled={loading} 
              >
                {loading ? 'Laddar...' : 'Försök igen'}
              </button>
          )}
          {isSessionError && (
              <Link href="/login">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                      Logga in
                  </button>
              </Link>
          )}
        </div>
      </div>
    );
  }

  // Om ingen användare, visa den publika startsidan (Preview)
  if (!user) {
    return (
      <div className="bg-white min-h-screen"> {/* Ändrad från gradient till vit bakgrund */}

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

  // Inloggad användare - Visa projektöversikten
  const isAdmin = profile?.is_admin || false;
  return (
    <div className="py-8">
      {/* Header för projektöversikten */}
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
              <button 
                onClick={handleManualReload} 
                className="underline text-blue-600 hover:text-blue-800 font-medium" 
                disabled={loading} // Inaktivera under laddning
              >
                {loading ? 'Uppdaterar...' : 'Uppdatera nu'}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Felmeddelande visas här om `error` finns OCH `usedCachedData` är true */}
      {error && usedCachedData && (
          <div className="px-4 sm:px-6 lg:px-8 mb-4">
              <div className="col-span-full bg-red-50 border border-red-200 p-3 rounded-md text-sm text-red-800">
                  <p>Kunde inte hämta senaste data. Visar lagrad information. Fel: {error}</p> {/* Visa felet för felsökning */}
              </div>
          </div>
      )}

      {/* Fall för inga projekt (antingen tomt eller efter misslyckad laddning utan cache) */}
      {!loading && projects.length === 0 && !error && (
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
              {/* Projektkortets innehåll */}
              <div className="flex-grow flex">
                 <div className="p-4 flex-grow w-1/2 flex flex-col">
                    {/* Titel och detaljer */}
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
                 {/* Bild eller placeholder */}
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
