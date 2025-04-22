'use client'; // Gör om till klientkomponent för att använda hooks

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client'; // Använd klient-klient
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quote, Profile, Project } from '@/lib/types'; // Importera typer
import Image from 'next/image'; // Importera Image

// Byt namn på komponenten för att matcha filnamnet (valfritt men bra praxis)
export default function StartPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- Preview states/hooks på toppnivå ---
  const [previewProjects, setPreviewProjects] = useState<Partial<Project>[]>([]);
  const [previewQuotes, setPreviewQuotes] = useState<Partial<Quote>[]>([]);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) {
          console.error("Fel vid hämtning av användare:", getUserError);
          throw new Error(getUserError.message || 'Kunde inte hämta användardata.');
        }
        
        if (!user) {
          console.log("Ingen användare inloggad, visar preview.");
          setUser(null);
          setLoading(false); // Sätt loading till false så preview kan köras
          return;
        }
        
        setUser(user);
        
        try {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, is_admin')
            .eq('id', user.id)
            .single();
          
          if (profileError) {
            console.error("Fel vid hämtning av profil:", profileError);
            throw new Error(profileError.message || 'Kunde inte hämta profil.');
          }
          
          if (!profileData) {
            throw new Error('Kunde inte hitta användarprofil.');
          }
          
          setProfile(profileData);
          
          try {
            const { data: projectData, error: projectsError } = await supabase
              .from('projects')
              .select('id, title, description, status, created_at, updated_at, category, created_by, client_name, tender_document_url, building_image_url, area, gross_floor_area, start_date')
              .order('created_at', { ascending: false });
            
            if (projectsError) {
              console.error("Fel vid hämtning av projekt:", projectsError);
              throw new Error(projectsError.message || 'Kunde inte hämta projekt.');
            }
            
            setProjects((projectData as Project[]) || []);
          } catch (projectErr: any) {
            console.error("Fel vid hämtning av projekt:", projectErr);
            setError(projectErr.message || 'Kunde inte hämta projekt.');
          }
        } catch (profileErr: any) {
          console.error("Fel vid hämtning av profil:", profileErr);
          setError(profileErr.message || 'Kunde inte hämta profil.');
        }
      } catch (err: any) {
        console.error("Fel vid datahämtning:", err);
        setError(err.message || 'Ett oväntat fel uppstod.');
        setUser(null);
      } finally {
        setLoading(false); // Säkerställ att loading alltid sätts till false oavsett resultat
      }
    };
    
    // Lägg till en timeout för att förhindra upprepade anrop vid nätverksproblem
    const timeoutId = setTimeout(() => {
      fetchData();
    }, 100);
    
    // Städa upp timeout vid komponentavmontering
    return () => clearTimeout(timeoutId);
  }, []);

  // --- Preview useEffect ---
  useEffect(() => {
    // Kör bara om user är null OCH initial loading är klar
    if (user !== null || loading) return;
    const fetchPreviewData = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        // Begränsa antalet projekt som hämtas för preview
        const { data: projectData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, category, client_name, area, gross_floor_area, start_date, tender_document_url, building_image_url')
          .limit(3); // Hämta endast de 3 senaste projekten för startsidan
        if (projectsError) throw new Error(projectsError.message);
        setPreviewProjects(projectData || []);

        // Hämtar offerter för de specifika projekten om nödvändigt
        const projectIds = (projectData || []).map(p => p.id).filter(Boolean);
        if (projectIds.length > 0) {
          const { data: quoteData, error: quotesError } = await supabase
            .from('quotes')
            .select('id, project_id, contractor_type')
            .in('project_id', projectIds); // Hämta endast offerter för visade projekt
          if (quotesError) throw new Error(quotesError.message);
          setPreviewQuotes(quoteData || []);
        } else {
           setPreviewQuotes([]); // Nollställ om inga projekt finns
        }

      } catch (err: any) {
        setPreviewError(err.message);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreviewData();
  }, [user, loading]); // Trigger när user blir null och loading är false

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

  if (loading) {
    // Använd den globala loading.tsx
    return null; // Denna renderas inte eftersom layout.tsx hanterar suspense
  }

  // Om ingen användare, visa den nya startsidan
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
           {previewLoading && <div className="text-center py-10">Laddar projekt...</div>}
           {previewError && <div className="text-center text-red-600 py-10">Kunde inte ladda projekt: {previewError}</div>}
           {!previewLoading && !previewError && previewProjects.length === 0 && (
             <div className="text-center text-gray-500 py-10">Inga projekt att visa just nu.</div>
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

  // Om användare är inloggad, visa den vanliga dashboarden
  const isAdmin = profile?.is_admin || false;
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

      {error && <p className="text-red-600">Kunde inte ladda projekt: {error}</p>}
      {!error && projects.length === 0 ? (
        <div className="text-center py-10 px-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Inga projekt</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAdmin ? 'Kom igång genom att skapa ett nytt projekt.' : 'Du har inte blivit tillagd i några projekt än.'}
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block border rounded-lg shadow hover:shadow-md transition-shadow bg-white overflow-hidden group">
              <div className="flex h-full">
                <div className="p-4 flex-grow flex flex-col">
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
                          // Förkorta specifika kategorier
                          if (project.category.startsWith('Kommersiell byggnad')) return 'Kommersiell';
                          if (project.category.startsWith('Teknisk anläggning')) return 'Teknisk';
                          // Lägg till fler regler här vid behov
                          return project.category; // Standard fallback
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        Länk
                      </a>
                    </div>
                  )}
                </div>

                {project.building_image_url && (
                  <div className="w-1/2 flex-shrink-0 relative">
                    <Image
                      src={project.building_image_url}
                      alt={`Miniatyrbild för ${project.title}`}
                      layout="fill"
                      objectFit="cover"
                      className="group-hover:opacity-90 transition-opacity"
                    />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
