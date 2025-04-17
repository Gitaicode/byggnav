'use server';

import { z } from 'zod';
import { createServerActionClient } from '@/lib/supabase/server'; // Korrekt funktionsnamn
import { Database } from '@/lib/supabase/database.types'; // Antagen standardplats
import { companyTypes, contractorTypes } from '@/lib/constants';
import { revalidatePath } from 'next/cache';

// Schema för validering på servern (matchar klient-schemat)
const emailRegistrationSchema = z.object({
  email: z.string().email('Ange en giltig e-postadress.'),
  city: z.string().optional(),
  company_type: z.enum(companyTypes, { errorMap: () => ({ message: 'Välj en giltig företagstyp.' }) }),
  contractor_type: z.enum(contractorTypes, { errorMap: () => ({ message: 'Välj en giltig entreprenörstyp.' }) }),
});

type EmailRegistrationFormData = z.infer<typeof emailRegistrationSchema>;

export async function registerEmailAction(
  formData: EmailRegistrationFormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createServerActionClient(); // Anropa funktionen för att få klienten

  // 1. Validera input
  const validatedFields = emailRegistrationSchema.safeParse(formData);
  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    return { error: 'Ogiltig indata. Kontrollera fälten.' };
  }

  const { email, city, company_type, contractor_type } = validatedFields.data;

  // 2. Kontrollera adminbehörighet
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      return { error: 'Autentisering misslyckades.' };
  }

  // Använd den inbyggda funktionen för att kolla admin - detta förutsätter att den finns och fungerar
  const { data: isAdminData, error: isAdminError } = await supabase.rpc('is_current_user_admin');

  if (isAdminError) {
    console.error('Error checking admin status:', isAdminError);
    return { error: 'Kunde inte verifiera administratörsstatus.' };
  }

  if (!isAdminData) { // Om funktionen returnerar false
      return { error: 'Åtkomst nekad. Kräver administratörsrättigheter.' };
  }

  // 3. Försök infoga i databasen
  const { error: insertError } = await supabase
    .from('registered_emails')
    .insert({
      email: email,
      city: city || null,
      company_type: company_type,
      contractor_type: contractor_type,
    });

  if (insertError) {
    console.error('Database Insert Error:', insertError);
    if (insertError.code === '23505') { // PostgreSQL unique violation
      return { error: 'E-postadressen är redan registrerad.' };
    }
    return { error: 'Kunde inte registrera e-postadressen i databasen.' };
  }

  // 4. Rensa cache för sökvägen så att listan uppdateras
  revalidatePath('/admin/registrera-email');

  return { success: true };
} 