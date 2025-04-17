-- supabase/migrations/20240726103000_create_registered_emails.sql

-- Skapa enum för Företagstyp
CREATE TYPE public."CompanyType" AS ENUM (
    'Underentreprenör',
    'Totalentreprenör',
    'Beställare'
);

-- Skapa tabell för registrerade e-postadresser
CREATE TABLE public.registered_emails (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    email text NOT NULL UNIQUE,
    city text NULL,
    company_type public."CompanyType" NOT NULL,
    contractor_type text NOT NULL -- Vi validerar mot listan i koden
);

-- Lägg till RLS (Row Level Security) - initialt neka allt
ALTER TABLE public.registered_emails ENABLE ROW LEVEL SECURITY;

-- Skapa policy för att admins ska kunna läsa/skriva (antar att du har en 'is_admin()' funktion)
-- !! VIKTIGT: Anpassa denna policy baserat på din faktiska admin-logik !!
-- Om du inte har en is_admin() funktion, behöver vi definiera access på annat sätt.
/* -- Exempel på policy (avkommentera och anpassa om du har is_admin):
CREATE POLICY "Allow admin full access" 
ON public.registered_emails 
FOR ALL 
USING (is_admin()) -- Kontrollerar om användaren är admin
WITH CHECK (is_admin());
*/

-- Skapa en trigger för att automatiskt uppdatera 'updated_at'
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_registered_emails_updated_at
BEFORE UPDATE ON public.registered_emails
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Kommentar om index: Ett index skapas automatiskt för 'email' på grund av UNIQUE constraint.
-- Överväg index på 'city', 'company_type', 'contractor_type' om du ofta filtrerar på dessa.
-- CREATE INDEX idx_registered_emails_city ON public.registered_emails(city);
-- CREATE INDEX idx_registered_emails_company_type ON public.registered_emails(company_type);
-- CREATE INDEX idx_registered_emails_contractor_type ON public.registered_emails(contractor_type); 