// Imports för Server Component
import React from 'react';
import { createServerActionClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { fetchProjects, fetchRegisteredEmails } from './data'; // Funktioner för att hämta data (server-side)
import RegisterEmailClientContent from './client-content'; // Den nya klientkomponenten
import { Database } from "@/lib/supabase/database.types"; // Antagen standardplats

// Åtkomst nekad-komponent (kan ligga här eller i egen fil)
function AccessDenied() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Åtkomst nekad</h1>
      <p className="text-red-700">Du måste vara administratör för att se denna sida.</p>
    </div>
  );
}

// Typdefinitioner (kan flyttas till types/index.ts om de används på fler ställen)
export type RegisteredEmail = Database['public']['Tables']['registered_emails']['Row'];
export type Project = Pick<Database['public']['Tables']['projects']['Row'], 'id' | 'title'>;

// Huvudsaklig Server Component för sidan
export default async function RegisterEmailPage() {
  const cookieStore = cookies();
  const supabase = await createServerActionClient();

  // Kontrollera admin-status
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Om redirect behövs istället för "Åtkomst nekad", importera och använd redirect från next/navigation
    return <AccessDenied />;
  }
  const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_current_user_admin');
  if (isAdminError || !isAdminData) {
    console.error('Admin check failed:', isAdminError);
    return <AccessDenied />;
  }

  // Hämta initial data (endast om admin)
  const initialEmails = await fetchRegisteredEmails();
  const initialProjects = await fetchProjects();

  // Rendera klientkomponenten med initial data
  return (
    <RegisterEmailClientContent 
      initialEmails={initialEmails} 
      initialProjects={initialProjects} 
    />
  );
} 