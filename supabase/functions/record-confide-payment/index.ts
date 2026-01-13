import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[record-confide-payment] start");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[record-confide-payment] authed", { userId: user.id, email: user.email });

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Session ID is required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Verify the checkout session is paid
    console.log("[record-confide-payment] retrieving session", { session_id });
    const session = await stripe.checkout.sessions.retrieve(session_id);
    console.log("[record-confide-payment] session status", { payment_status: session.payment_status });
    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    // Record the unlock in the database
    const { error: insertError } = await supabaseClient
      .from("confide_unlocks")
      .insert({
        user_id: user.id,
        stripe_session_id: session_id,
      });

    if (insertError) {
      console.log("[record-confide-payment] insert error", { message: insertError.message });
      // Ignore duplicate key errors (already recorded)
      if (!insertError.message.toLowerCase().includes("duplicate")) {
        throw insertError;
      }
    }

    console.log("[record-confide-payment] recorded");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
