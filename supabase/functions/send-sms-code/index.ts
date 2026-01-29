import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendSmsRequest {
  phoneNumber: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Brak autoryzacji" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowy token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Parse request body
    const { phoneNumber }: SendSmsRequest = await req.json();

    // Validate phone number (Polish format)
    const cleanPhone = phoneNumber.replace(/\s+/g, "").replace(/^\+48/, "");
    if (!/^[0-9]{9}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowy numer telefonu. Podaj 9 cyfr." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old codes for this user
    await supabase
      .from("phone_verification_codes")
      .delete()
      .eq("user_id", userId);

    // Insert new verification code
    const { error: insertError } = await supabase
      .from("phone_verification_codes")
      .insert({
        user_id: userId,
        phone_number: cleanPhone,
        code: code,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      console.error("Error inserting verification code:", insertError);
      return new Response(
        JSON.stringify({ error: "Błąd zapisu kodu weryfikacyjnego" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send SMS via SMSPlanet API
    const smsApiToken = Deno.env.get("SMSPLANET_API_TOKEN");
    if (!smsApiToken) {
      console.error("SMSPLANET_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ error: "Konfiguracja SMS nie jest dostępna" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smsMessage = `Twój kod weryfikacyjny BaBaGu: ${code}. Ważny przez 10 minut.`;
    
    const smsResponse = await fetch("https://api2.smsplanet.pl/sms", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${smsApiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        from: "BaBaGu",
        to: cleanPhone,
        msg: smsMessage,
        transactional: "1",
      }),
    });

    const smsResult = await smsResponse.json();
    console.log("SMS API response:", smsResult);

    if (!smsResponse.ok || smsResult.errorCode) {
      console.error("SMS sending failed:", smsResult);
      return new Response(
        JSON.stringify({ error: smsResult.errorMsg || "Błąd wysyłania SMS" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Kod weryfikacyjny został wysłany" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-sms-code:", error);
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
