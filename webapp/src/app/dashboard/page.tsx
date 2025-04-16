'use client'; // Gör om till klientkomponent för att använda hooks

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client'; // Använd klient-klient
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Quote, Profile, Project } from '@/lib/types'; // Importera typer

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null); // Bättre typning kan göras
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Hämta användaren på nytt (eller lita på att sessionen finns)
        const { data: { user }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError || !user) {
            throw new Error(getUserError?.message || 'Kunde inte verifiera användaren.');
        }
        // Sätt användaren om du behöver den specifikt i state
        setUser(user); 

        // 2. Hämta profil (inkludera id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, is_admin') // Lägg till id
          .eq('id', user.id) // Använd user.id här
          .single();

        if (profileError || !profileData) {
          throw new Error(profileError?.message || 'Kunde inte hämta profil.');
        }
        setProfile(profileData); // Nu matchar typen Profile
        const isAdmin = profileData.is_admin;

        // 3. Hämta projekt (inkludera nya fält)
        const { data: projectData, error: projectsError } = await supabase
          .from('projects')
          .select('id, title, description, status, created_at, updated_at, category, created_by, client_name, tender_document_url')
          .order('created_at', { ascending: false });

        if (projectsError) {
          throw new Error(projectsError.message || 'Kunde inte hämta projekt.');
        }
        setProjects((projectData as Project[]) || []); // Nu matchar typen Project[]

      } catch (err: any) {
          console.error("Fel vid datahämtning på dashboard:", err);
          setError(err.message);
          // Överväg att sätta user/profile till null här om fetch misslyckas?
      } finally {
          setLoading(false);
      }
    };

    fetchData();
    // Ta bort router som dependency om den inte används för annat än redirect
  }, []); // Tom dependency array, körs bara en gång vid mount

  // Visa laddningsindikator medan data hämtas
  if (loading) {
    // Använd samma skeleton som i loading.tsx för konsekvens
    return (
        <div>
           <div className="flex justify-between items-center mb-6">
             <h1 className="text-3xl font-bold">Dashboard</h1>
             <div className="h-9 w-36 bg-gray-200 rounded animate-pulse"></div>
           </div>
          <h2 className="text-xl font-semibold mb-4">Projektöversikt</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 shadow bg-white">
                  <div className="h-5 w-3/4 bg-gray-200 rounded mb-3 animate-pulse"></div>
                  <div className="h-4 w-full bg-gray-200 rounded mb-4 animate-pulse"></div>
                  <div className="flex justify-between items-center text-xs">
                    <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
            ))}
          </div>
        </div>
      );
  }

  // Om ingen användare (t.ex. om omdirigering inte hunnit ske)
  if (!user) {
      return null; // Eller en fallback
  }
  
  const isAdmin = profile?.is_admin || false;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projekt</h1>
        {isAdmin && (
          <Link href="/projects/new">
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Skapa nytt projekt
            </button>
          </Link>
        )}
      </div>

      <h2 className="text-xl font-semibold mb-4">Projektöversikt</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="border rounded-lg p-4 shadow hover:shadow-md transition-shadow bg-white flex flex-col">
              <h3 className="text-lg font-semibold mb-2 truncate">
                  <Link href={`/projects/${project.id}`} className="hover:text-blue-600 hover:underline">
                      {project.title}
                  </Link>
              </h3>
              <p className="text-sm text-gray-600 mb-3 truncate">
                {project.description || 'Ingen beskrivning'}
              </p>
              
              {project.client_name && (
                <p className="text-xs text-gray-500 mb-1 truncate">
                  Beställare: <span className="font-medium">{project.client_name}</span>
                </p>
              )}
              {project.tender_document_url && (
                <div className="text-xs text-gray-500 mb-3 truncate">
                  <span>Förfrågningsunderlag: </span>
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

              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Status: <span className="font-medium capitalize">{project.status}</span></span>
                <span>{new Date(project.created_at).toLocaleDateString('sv-SE')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 