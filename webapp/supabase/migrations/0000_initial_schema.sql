-- 0000_initial_schema.sql

-- Skapa profiles tabellen
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  email text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  primary key (id)
);
-- Aktivera Row Level Security (RLS)
alter table public.profiles enable row level security;
-- Policy: Användare kan se sin egen profil
create policy "Users can view their own profile." on public.profiles for select
  using ( auth.uid() = id );
-- Policy: Användare kan uppdatera sin egen profil (t.ex. e-post om den ändras)
create policy "Users can update their own profile." on public.profiles for update
  using ( auth.uid() = id );
-- Policy: Admins kan se alla profiler (Behövs för admin-funktioner)
create policy "Admins can view all profiles." on public.profiles for select
  using ( (select is_admin from public.profiles where id = auth.uid()) = true );
-- Policy: Admins kan uppdatera alla profiler (t.ex. sätta is_admin)
create policy "Admins can update all profiles." on public.profiles for update
  using ( (select is_admin from public.profiles where id = auth.uid()) = true );


-- Funktion för att hantera nya användare och skapa en profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    -- Sätt admin till true om e-posten matchar den fördefinierade admin-eposten
    (new.email = 'mikael.persson@constoab.se')
  );
  return new;
end;
$$;

-- Trigger som kör handle_new_user() efter att en ny användare skapas i auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Skapa projects tabellen
create table public.projects (
    id uuid default gen_random_uuid() not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    title text not null,
    description text,
    category text,
    status text default 'new'::text not null, -- T.ex. new, active, completed, archived
    created_by uuid null references public.profiles(id) on delete set null,

    primary key (id)
);
-- Aktivera RLS
alter table public.projects enable row level security;
-- Policy: Autentiserade användare kan se projekt (justeras senare för deltagare)
create policy "Authenticated users can view projects." on public.projects for select
  using ( auth.role() = 'authenticated' );
-- Policy: Admins kan skapa projekt
create policy "Admins can create projects." on public.projects for insert
  with check ( (select is_admin from public.profiles where id = auth.uid()) = true );
-- Policy: Admins eller skaparen kan uppdatera projekt
create policy "Admins or creator can update projects." on public.projects for update
 using (
    (select is_admin from public.profiles where id = auth.uid()) = true OR
    created_by = auth.uid()
 )
 with check (
    (select is_admin from public.profiles where id = auth.uid()) = true OR
    created_by = auth.uid()
 );
-- Policy: Admins eller skaparen kan ta bort projekt
create policy "Admins or creator can delete projects." on public.projects for delete
 using (
    (select is_admin from public.profiles where id = auth.uid()) = true OR
    created_by = auth.uid()
 );


-- Skapa project_participants tabellen (just nu ej implementerad i policys ovan)
create table public.project_participants (
    id uuid default gen_random_uuid() not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role text, -- T.ex. 'owner', 'contractor', 'viewer'

    primary key (id),
    unique (project_id, user_id) -- En användare kan bara delta en gång per projekt
);
-- Aktivera RLS
alter table public.project_participants enable row level security;
-- Policy: Deltagare kan se sina egna deltaganden
create policy "Participants can view their own participation." on public.project_participants for select
 using ( user_id = auth.uid() );
-- Policy: Admins kan se alla deltaganden
create policy "Admins can view all participations." on public.project_participants for select
 using ( (select is_admin from public.profiles where id = auth.uid()) = true );
-- Policy: Admins kan lägga till/ta bort deltagare (eller projektägare? TBD)
create policy "Admins can manage participants." on public.project_participants for all
 using ( (select is_admin from public.profiles where id = auth.uid()) = true )
 with check ( (select is_admin from public.profiles where id = auth.uid()) = true );


-- Skapa quotes tabellen
create table public.quotes (
    id uuid default gen_random_uuid() not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade, -- Den som laddade upp
    contractor_type text not null, -- T.ex. El, VS, Ventilation
    amount numeric not null,
    file_path text not null, -- Sökväg i Supabase Storage
    file_name text not null,

    primary key (id)
);
-- Aktivera RLS
alter table public.quotes enable row level security;
-- Policy: Uppladdaren kan se sin egen offert
create policy "Users can view their own quotes." on public.quotes for select
 using ( user_id = auth.uid() );
-- Policy: Admins kan se alla offerter
create policy "Admins can view all quotes." on public.quotes for select
 using ( (select is_admin from public.profiles where id = auth.uid()) = true );
-- Policy: Autentiserade användare kan ladda upp offerter (kopplat till ett projekt)
create policy "Authenticated users can upload quotes." on public.quotes for insert
 with check ( auth.role() = 'authenticated' );
-- Policy: Uppladdaren kan ta bort sin egen offert
create policy "Users can delete their own quotes." on public.quotes for delete
 using ( user_id = auth.uid() );
-- Policy: Admins kan ta bort alla offerter
create policy "Admins can delete any quote." on public.quotes for delete
 using ( (select is_admin from public.profiles where id = auth.uid()) = true );


-- Funktion för att uppdatera 'updated_at' timestamp automatiskt
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
   new.updated_at = timezone('utc'::text, now());
   return new;
end;
$$;

-- Skapa triggers för att köra funktionen på relevanta tabeller
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger handle_updated_at before update on public.projects
  for each row execute procedure public.update_updated_at_column();

create trigger handle_updated_at before update on public.quotes
  for each row execute procedure public.update_updated_at_column();

-- Initialisera Storage Bucket för offerter
-- Detta görs oftast via Supabase UI, men kan scriptas:
-- insert into storage.buckets (id, name, public) values ('quotes', 'quotes', false);
-- Behöver RLS policies för storage också!

-- Policy för Storage: Autentiserade användare kan ladda upp till 'quotes' bucketen
-- create policy "Allow authenticated uploads to quotes bucket" on storage.objects for insert
-- with check ( bucket_id = 'quotes' and auth.role() = 'authenticated' );

-- Policy för Storage: Användare kan se/ladda ner filer de har access till via quotes-tabellen
-- Denna är mer komplex och involverar ofta en funktion för att kontrollera access
-- Exempel (kräver anpassning):
-- create policy "Allow download of own or accessible quotes" on storage.objects for select
-- using (
--   bucket_id = 'quotes' and
--   auth.uid() = owner OR -- Om ägaren är satt korrekt vid uppladdning
--   (select count(*) from public.quotes q where q.file_path = storage.objects.name and (q.user_id = auth.uid() or (select is_admin from public.profiles where id = auth.uid()) = true)) > 0 -- Kolla om användaren äger offerten eller är admin
-- ); 