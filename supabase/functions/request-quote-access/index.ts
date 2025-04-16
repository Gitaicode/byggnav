import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@3.2.0'; // Kontrollera senaste version vid behov

// CORS Headers - Viktigt för anrop från webbläsare
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Eller begränsa till din frontend-URL
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Tillåt POST och preflight OPTIONS
};

serve(async (req) => {
  // Hantera preflight-förfrågan (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initiera klienter
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:3000'; // Fallback

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Supabase-klient med service_role för att hämta användarinfo etc.
    // Försiktighet rekommenderas med service_role. Använd specifika funktioner/vyer om möjligt.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // 2. Hämta quoteId från request body
    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'Missing quoteId in request body.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Hämta användarinfo från Authorization header (JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requesterUser }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !requesterUser) {
      console.error('Auth Error:', userError);
      return new Response(JSON.stringify({ error: 'Authentication failed.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const requesterId = requesterUser.id;
    const requesterEmail = requesterUser.email || 'Okänd användare'; // Hämta e-post

    // 4. Hämta offert och uppladdarinfo
    const { data: quoteData, error: quoteError } = await supabaseAdmin
      .from('quotes')
      .select(`
        user_id,
        contractor_type,
        project_id,
        projects ( title )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quoteData) {
      console.error('Quote fetch error:', quoteError);
      return new Response(JSON.stringify({ error: 'Could not find the specified quote.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const uploaderId = quoteData.user_id;
    const quoteType = quoteData.contractor_type;
    // Typescript kan klaga här om 'projects' är null, hantera det.
    const projectTitle = (quoteData.projects as { title: string } | null)?.title || 'Okänt projekt';

    // Förhindra att man begär access till sin egen offert
    if (requesterId === uploaderId) {
         return new Response(JSON.stringify({ error: 'You cannot request access to your own quote.' }), {
             status: 400,
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
    }

    // 5. Kontrollera befintlig förfrågan
    const { data: existingRequest, error: existingReqError } = await supabaseAdmin
      .from('quote_access_requests')
      .select('id, status')
      .eq('quote_id', quoteId)
      .eq('requester_user_id', requesterId)
      .in('status', ['pending', 'granted']) // Kolla bara pending eller granted
      .maybeSingle(); // Vi förväntar oss max en

    if (existingReqError) {
      console.error('Existing request check error:', existingReqError);
      // Fortsätt inte om vi inte kan verifiera detta säkert
      return new Response(JSON.stringify({ error: 'Database error checking existing requests.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingRequest) {
      const message = existingRequest.status === 'pending'
        ? 'Access request already pending.'
        : 'Access already granted.';
      return new Response(JSON.stringify({ message }), { // Skicka 'message' istället för 'error' om det inte är ett fel
        status: 200, // Eller 409 Conflict? 200 är ok här.
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Skapa ny förfrågan
    const { error: insertError } = await supabaseAdmin
      .from('quote_access_requests')
      .insert({
        quote_id: quoteId,
        requester_user_id: requesterId,
        uploader_user_id: uploaderId,
        // status: 'pending' // är default
      });

    if (insertError) {
      console.error('Insert request error:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create access request.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Hämta uppladdarens e-post (via profiles eller auth.users)
     const { data: uploaderProfile, error: uploaderError } = await supabaseAdmin
            .from('profiles') // Eller direkt från auth.users om email finns där
            .select('email')
            .eq('id', uploaderId)
            .single();

    if (uploaderError || !uploaderProfile?.email) {
       console.error('Could not fetch uploader email:', uploaderError);
       // Logga felet, men fortsätt - förfrågan är skapad.
    } else {
       // 8. Skicka e-postavisering till uppladdaren (om e-post hittades)
       const uploaderEmail = uploaderProfile.email;
       try {
         await resend.emails.send({
           from: 'Byggmäklare Notiser <notiser@dinverifieradedoman.se>', // **BYT TILL DIN VERIFIERADE DOMÄN/AVSÄNDARE**
           to: uploaderEmail,
           subject: `Förfrågan om offertinsyn för ${projectTitle}`,
           html: `
             <p>Hej!</p>
             <p>Användaren ${requesterEmail} har begärt att få ta del av offerten för <strong>${quoteType}</strong> i projektet <strong>${projectTitle}</strong>.</p>
             <p>Logga in på <a href="${appBaseUrl}/projects/${quoteData.project_id}">projektsidan</a> för att granska och godkänna/neka förfrågan.</p>
             <p>Med vänliga hälsningar,</p>
             <p>Byggmäklare-plattformen</p>
           `
         });
         console.log(`Access request notification email sent to ${uploaderEmail}`);
       } catch (emailError) {
         console.error('Error sending email via Resend:', emailError);
         // Logga felet, men betrakta huvudoperationen som lyckad.
       }
    }

    // 9. Returnera success
    return new Response(JSON.stringify({ success: true, message: 'Access request created successfully.' }), {
      status: 201, // Created
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