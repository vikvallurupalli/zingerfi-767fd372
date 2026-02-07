import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user auth
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to access keypairs table (no RLS policies on this table)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check for existing active keypair
    const { data: existingKeypair, error: fetchError } = await supabaseAdmin
      .from('fast_encrypt_keypairs')
      .select('id, version, public_key')
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching keypair:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch keypair' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingKeypair) {
      console.log('Returning existing keypair, version:', existingKeypair.version);
      return new Response(JSON.stringify({
        keypair_id: existingKeypair.id,
        version: existingKeypair.version,
        public_key: existingKeypair.public_key,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate new ECDH P-256 keypair
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );

    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
    const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));

    const userId = claimsData.claims.sub;

    const { data: newKeypair, error: insertError } = await supabaseAdmin
      .from('fast_encrypt_keypairs')
      .insert({
        version: 1,
        public_key: publicKeyBase64,
        private_key: privateKeyBase64,
        is_active: true,
        created_by: userId,
      })
      .select('id, version, public_key')
      .single();

    if (insertError) {
      console.error('Error inserting keypair:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create keypair' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Created new FastEncrypt keypair, version:', newKeypair.version);

    return new Response(JSON.stringify({
      keypair_id: newKeypair.id,
      version: newKeypair.version,
      public_key: newKeypair.public_key,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('FastEncrypt init error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
