import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendEmailRequest {
  email: string;
  userId: string;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get SMTP configuration
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpFrom = Deno.env.get("SMTP_FROM");

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      console.error("Missing SMTP configuration");
      return new Response(
        JSON.stringify({ error: "Konfiguracja email nie jest dostępna" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const userEmail = claimsData.claims.email as string;

    if (!userEmail) {
      return new Response(
        JSON.stringify({ error: "Brak adresu email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate verification token
    const verificationToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Delete old tokens for this user
    await supabase
      .from("email_verification_tokens")
      .delete()
      .eq("user_id", userId);

    // Insert new verification token
    const { error: insertError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        email: userEmail,
        token: verificationToken,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (insertError) {
      console.error("Error inserting verification token:", insertError);
      return new Response(
        JSON.stringify({ error: "Błąd zapisu tokenu weryfikacyjnego" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create verification URL
    const appUrl = req.headers.get("origin") || "https://babagu.pl";
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: smtpUser,
          password: smtpPass,
        },
      },
    });

    // Send email
    await client.send({
      from: smtpFrom,
      to: userEmail,
      subject: "Potwierdź swój adres e-mail - BaBaGu",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potwierdź swój adres e-mail</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h1 style="margin: 0; font-size: 28px; color: #333333; font-weight: bold;">BaBaGu</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 20px 40px; text-align: center;">
                      <h2 style="margin: 0; font-size: 22px; color: #333333;">Potwierdź swój adres e-mail</h2>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <p style="margin: 0; font-size: 16px; line-height: 24px; color: #666666;">
                        Cześć! Dziękujemy za rejestrację w BaBaGu. 
                        Kliknij przycisk poniżej, aby potwierdzić swój adres e-mail i rozpocząć poznawanie nowych osób!
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 30px 40px; text-align: center;">
                      <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; background-color: #7C3AED; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                        Potwierdź adres e-mail
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 40px 20px 40px; text-align: center;">
                      <p style="margin: 0; font-size: 14px; color: #999999;">
                        Lub skopiuj i wklej ten link w przeglądarce:
                      </p>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #7C3AED; word-break: break-all;">
                        ${verificationUrl}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 20px 40px 40px 40px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        Ten link wygaśnie za 24 godziny.<br>
                        Jeśli nie zakładałeś konta w BaBaGu, zignoruj tę wiadomość.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    await client.close();

    console.log("Verification email sent successfully to:", userEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Email weryfikacyjny został wysłany" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-verification-email:", error);
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
