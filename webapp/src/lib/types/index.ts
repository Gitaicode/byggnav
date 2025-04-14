// src/lib/types/index.ts

// Typ för en profil (kan utökas vid behov)
export interface Profile {
  id: string;
  email?: string; // E-post kan vara null beroende på RLS/query
  is_admin: boolean;
}

// Typ för ett projekt (kan utökas)
export interface Project {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  created_by: string | null;
  client_name: string | null;
  tender_document_url: string | null;
  // Eventuellt lägga till relation till profiles här om det behövs
}

// Typ för en offert, inklusive uppladdarens profil
export interface Quote {
  id: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  user_id: string;
  contractor_type: string;
  amount: number;
  file_path: string;
  file_name: string;
  profiles: Pick<Profile, 'email'> | null; // Hämta endast e-post från profilen
} 