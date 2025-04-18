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
        if (getUserError || !user) {
          // Nu sätter vi inte fel här, utan låter preview-läget ta över
          console.log("Ingen användare inloggad, visar preview.");
          setUser(null);
          setLoading(false); // Sätt loading till false så preview kan köras
          return; 
        }
        setUser(user);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, is_admin')
          .eq('id', user.id)
          .single();
        if (profileError || !profileData) {
          throw new Error(profileError?.message || 'Kunde inte hämta profil.');
        }
        setProfile(profileData);
        const { data: projectData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, description, status, created_at, updated_at, category, created_by, client_name, tender_document_url, building_image_url, area, gross_floor_area, start_date')
          .order('created_at', { ascending: false });
        if (projectsError) {
          throw new Error(projectsError.message || 'Kunde inte hämta projekt.');
        }
        setProjects((projectData as Project[]) || []);
      } catch (err: any) {
        console.error("Fel vid datahämtning:", err);
        setError(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- Preview useEffect ---
  useEffect(() => {
    // Kör bara om user är null OCH initial loading är klar
    if (user !== null || loading) return; 
    const fetchPreviewData = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const { data: projectData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, category, client_name, area, gross_floor_area, start_date, tender_document_url, building_image_url');
        if (projectsError) throw new Error(projectsError.message);
        setPreviewProjects(projectData || []);
        const { data: quoteData, error: quotesError } = await supabase
          .from('quotes')
          .select('id, project_id, contractor_type');
        if (quotesError) throw new Error(quotesError.message);
        setPreviewQuotes(quoteData || []);
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

  // Om ingen användare, visa preview + knappar
  if (!user) {
    if (previewLoading) {
      return <div className="text-center py-10">Laddar projekt...</div>;
    }
    if (previewError) {
      return <div className="text-center text-red-600 py-10">Kunde inte ladda projekt: {previewError}</div>;
    }
    return (
      <div className="py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Projekt</h1>
        {/* Lägg till knappar här */}
        <div className="flex justify-center space-x-4 my-8">
           <Link href="/login">
             <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
               Logga in
             </button>
           </Link>
           <Link href="/register">
             <button className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
               Registrera
             </button>
           </Link>
         </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {previewProjects.map((project) => (
             <div key={project.id} className="block border rounded-lg shadow hover:shadow-md transition-shadow bg-white overflow-hidden group flex flex-row h-full min-h-[180px]">
              {/* Vänster: Projektinfo - Exakt samma klasser som inloggad vy */}
              <div className="p-4 flex-grow flex flex-col w-1/2">
                <h3 className="text-lg font-semibold mb-1">
                  {project.title}
                </h3>
                {project.area && (
                  <p className="text-sm text-gray-500 mb-1">
                    Område: <span className="font-medium text-gray-700">{project.area}</span>
                  </p>
                )}
                {project.client_name && (
                  <p className="text-sm text-gray-500 mb-1">
                    Beställare: <span className="font-medium text-gray-700">{project.client_name}</span>
                  </p>
                )}
                {project.category && (
                  <p className="text-sm text-gray-500 mb-1">
                    Kategori: <span className="font-medium text-gray-700">{project.category}</span>
                  </p>
                )}
                {project.gross_floor_area && (
                  <p className="text-sm text-gray-500 mb-1">
                    BTA: <span className="font-medium text-gray-700">{project.gross_floor_area.toLocaleString('sv-SE')} m²</span>
                  </p>
                )}
                {project.start_date && (
                  <p className="text-sm text-gray-500 mb-1">
                    Start: <span className="font-medium text-gray-700">{new Date(project.start_date).toLocaleDateString('sv-SE')}</span>
                  </p>
                )}
                {project.tender_document_url && (
                  <div className="text-sm text-gray-500 mb-1">
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
              {/* Mitten: Bild - Exakt samma klasser som inloggad vy */}
              {project.building_image_url && (
                <div className="w-1/3 flex-shrink-0 relative min-h-[180px]">
                  <Image
                    src={project.building_image_url}
                    alt={`Bild för ${project.title}`}
                    fill
                    className="object-cover group-hover:opacity-90 transition-opacity"
                    style={{ borderRadius: 0 }}
                  />
                </div>
              )}
              {/* Höger: Offertdel - Styling konsekvent med info */}
              <div className="flex flex-col justify-start w-1/4 p-4 border-l border-gray-200 bg-white">
                <div className="font-semibold text-lg mb-2 pb-1">Offerter</div>
                {offerCountByProject[project.id!] ? (
                  Object.entries(offerCountByProject[project.id!]).map(([cat, count]) => (
                    <div key={cat} className="text-sm text-gray-700 mb-1">
                      {cat}: {count}st.
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-400 italic">Inga offerter</div>
                )}
              </div>
            </div>
          ))}
        </div>
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
                     <p className="text-sm text-gray-600 mb-1">
                       Område: <span className="font-medium">{project.area}</span>
                     </p>
                  )}
                  {project.client_name && (
                    <p className="text-sm text-gray-500 mb-1">
                      Beställare: <span className="font-medium">{project.client_name}</span>
                    </p>
                  )}
                  {project.category && (
                    <p className="text-sm text-gray-500 mb-1">
                      Kategori: <span className="font-medium">
                      {
                        (() => {
                          let cat = project.category.includes('(') ? project.category.split('(')[0].trim() : project.category;
                          if (cat === 'Kommersiell byggnad') return 'Kommersiell';
                          if (cat === 'Teknisk anläggning') return 'Teknisk';
                          // Lägg till fler regler här vid behov
                          return cat;
                        })()
                      }
                      </span>
                    </p>
                  )}
                  {project.gross_floor_area && (
                    <p className="text-sm text-gray-500 mb-1">
                      BTA: <span className="font-medium">{project.gross_floor_area.toLocaleString('sv-SE')} m²</span>
                    </p>
                  )}
                  {project.start_date && (
                    <p className="text-sm text-gray-500 mb-1">
                      Start: <span className="font-medium">{new Date(project.start_date).toLocaleDateString('sv-SE')}</span>
                    </p>
                  )}
                  {project.tender_document_url && (
                    <div className="text-sm text-gray-500 mb-1">
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
