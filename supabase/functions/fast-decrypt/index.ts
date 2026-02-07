import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

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

    const userEmail = claimsData.claims.email;

    const { message_uid, ephemeral_public_key, encrypted_data } = await req.json();

    if (!message_uid || !ephemeral_public_key || !encrypted_data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: message_uid, ephemeral_public_key, encrypted_data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('FastDecrypt: Processing message_uid:', message_uid);

    // Use service role to access tables
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Look up message by UID
    const { data: message, error: msgError } = await supabaseAdmin
      .from('fast_encrypt_messages')
      .select('id, message_uid, recipient_email, keypair_id, is_decrypted')
      .eq('message_uid', message_uid)
      .maybeSingle();

    if (msgError) {
      console.error('Error fetching message:', msgError);
      return new Response(JSON.stringify({ error: 'Failed to fetch message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message not found. The message ID may be invalid.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check recipient email matches
    if (message.recipient_email.toLowerCase() !== userEmail?.toLowerCase()) {
      console.log('Recipient mismatch: expected', message.recipient_email, 'got', userEmail);
      return new Response(JSON.stringify({ error: 'You are not the intended recipient of this message. This message was encrypted for a different email address.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check one-time decryption
    if (message.is_decrypted) {
      return new Response(JSON.stringify({ error: 'This message has already been decrypted and cannot be decrypted again.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the keypair's private key
    const { data: keypair, error: kpError } = await supabaseAdmin
      .from('fast_encrypt_keypairs')
      .select('private_key')
      .eq('id', message.keypair_id)
      .single();

    if (kpError || !keypair) {
      console.error('Error fetching keypair:', kpError);
      return new Response(JSON.stringify({ error: 'Encryption key not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Import system private key
    const privateKeyBuffer = base64ToArrayBuffer(keypair.private_key);
    const systemPrivateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveKey']
    );

    // Import ephemeral public key from the sender
    const ephemeralPubBuffer = base64ToArrayBuffer(ephemeral_public_key);
    const ephemeralPublicKey = await crypto.subtle.importKey(
      'spki',
      ephemeralPubBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // Derive shared secret using ECDH
    const sharedSecret = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: ephemeralPublicKey },
      systemPrivateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Parse encrypted data: first 12 bytes = IV, rest = ciphertext
    const encryptedBuffer = base64ToArrayBuffer(encrypted_data);
    const iv = encryptedBuffer.slice(0, 12);
    const ciphertext = encryptedBuffer.slice(12);

    // Decrypt with AES-GCM
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedSecret,
      ciphertext
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);

    // Mark message as decrypted
    const { error: updateError } = await supabaseAdmin
      .from('fast_encrypt_messages')
      .update({ is_decrypted: true, decrypted_at: new Date().toISOString() })
      .eq('id', message.id);

    if (updateError) {
      console.error('Error marking message as decrypted:', updateError);
    }

    console.log('FastDecrypt: Successfully decrypted message:', message_uid);

    return new Response(JSON.stringify({ decrypted_message: decryptedText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('FastDecrypt error:', error);
    return new Response(JSON.stringify({ error: 'Decryption failed. The message may be corrupted or invalid.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
