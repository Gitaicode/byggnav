import { createServerActionClient } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/database.types"; // Antagen standardplats

// Hämta alla registrerade e-postadresser (kräver admin-behörighet via RLS)
export async function fetchRegisteredEmails() {
  const supabase = await createServerActionClient();
  const { data, error } = await supabase
    .from('registered_emails')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching registered emails:", error);
    // Här bör RLS-felet fångas upp om policyn inte är satt korrekt
    // Returnera tom lista vid fel för att undvika att sidan kraschar helt
    return []; 
  }
  return data || [];
}

// Hämta en lista med projekt (endast id och titel) för rullgardinsmenyn
export async function fetchProjects() {
  const supabase = await createServerActionClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, title')
    .order('title', { ascending: true });

  if (error) {
    console.error("Error fetching projects:", error);
    return [];
  }
  return data || [];
} 