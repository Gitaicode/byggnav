import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@3.2.0';

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initiera klienter
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:3000';

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Använd en Supabase-klient som agerar som den inloggade användaren för att respektera RLS
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
       global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });
    // Använd admin-klient för att hämta e-postadresser säkert
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // 2. Hämta requestId från request body
    const { requestId } = await req.json();
    if (!requestId) {
      return new Response(JSON.stringify({ error: 'Missing requestId in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Hämta den ursprungliga förfrågan (inkl. requester ID) - Använd admin för säker hämtning
    // RLS för UPDATE sköter behörighetskontrollen, men vi behöver requesterId för mejl
     const { data: requestData, error: fetchError } = await supabaseAdmin
        .from('quote_access_requests')
        .select(`
            requester_user_id,
            quote:quote_id (
                project_id,
                contractor_type,
                projects ( title )
            )
        `)
        .eq('id', requestId)
        .single();

     if (fetchError || !requestData) {
         console.error('Error fetching request details:', fetchError);
         return new Response(JSON.stringify({ error: 'Could not find the request details.' }), {
             status: 404,
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         });
     }

    // 4. Uppdatera status till 'granted' (RLS sköter behörighetskontroll)
    const { error: updateError } = await supabaseClient // Använd användarens klient här
      .from('quote_access_requests')
      .update({ status: 'granted' })
      .eq('id', requestId);
      // RLS-policyn säkerställer att endast ägaren (eller admin) kan göra detta

    if (updateError) {
      console.error('Update request error:', updateError);
       // Kolla specifikt om det är RLS-fel
      if (updateError.message.includes('violates row-level security policy')) {
           return new Response(JSON.stringify({ error: 'Permission denied to update this request.' }), {
             status: 403, // Forbidden
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }
      return new Response(JSON.stringify({ error: 'Failed to grant access.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Hämta requester's email för avisering (använd admin igen)
     const { data: requesterProfile, error: requesterError } = await supabaseAdmin
            .from('profiles') // Eller auth.users
            .select('email')
            .eq('id', requestData.requester_user_id)
            .single();

     if (requesterError || !requesterProfile?.email) {
        console.error('Could not fetch requester email:', requesterError);
        // Logga felet, men fortsätt - status är uppdaterad.
     } else {
        // 6. Skicka bekräftelsemejl till den som frågade
        const requesterEmail = requesterProfile.email;
        // Typa quote och project säkrare
        const quoteInfo = requestData.quote as { project_id: string, contractor_type: string, projects: { title: string } | null } | null;
        const projectTitle = quoteInfo?.projects?.title || 'Okänt projekt';
        const quoteType = quoteInfo?.contractor_type || 'Okänd offertstyp';
        const projectId = quoteInfo?.project_id;

        try {
          await resend.emails.send({
            from: 'Byggmäklare Notiser <notiser@dinverifieradedoman.se>', // **BYT**
            to: requesterEmail,
            subject: `Åtkomst beviljad för offert i ${projectTitle}`,
            html: `
              <p>Hej!</p>
              <p>Din förfrågan om att ta del av offerten för <strong>${quoteType}</strong> i projektet <strong>${projectTitle}</strong> har godkänts.</p>
              <p>Du kan nu se detaljerna och ladda ner filen när du loggar in på <a href="${appBaseUrl}/projects/${projectId}">projektets sida</a>.</p>
              <p>Med vänliga hälsningar,</p>
              <p>Byggmäklare-plattformen</p>
            `
          });
          console.log(`Access granted confirmation email sent to ${requesterEmail}`);
        } catch (emailError) {
          console.error('Error sending confirmation email via Resend:', emailError);
        }
     }

    // 7. Returnera success
    return new Response(JSON.stringify({ success: true, message: 'Access granted successfully.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});