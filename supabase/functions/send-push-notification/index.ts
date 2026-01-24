import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate OAuth2 access token from Service Account
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Prepare header and payload for JWT
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging"
  };

  // Base64url encode
  const encoder = new TextEncoder();
  const base64UrlEncode = (data: string) => {
    return btoa(data)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemContents = serviceAccount.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    encoder.encode(unsignedToken)
  );
  
  const signatureB64 = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );
  
  const jwt = `${unsignedToken}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token exchange error:', errorText);
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const { access_token } = await tokenResponse.json();
  return access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();
    
    console.log(`Sending push notification to user: ${user_id}`);
    console.log(`Title: ${title}, Body: ${body}`);
    
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
    }
    
    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;
    
    console.log(`Using Firebase project: ${projectId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get active device tokens for user
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError);
      throw tokensError;
    }

    if (!tokens?.length) {
      console.log('No active tokens found for user');
      return new Response(
        JSON.stringify({ sent: 0, message: 'No active tokens' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tokens.length} active token(s)`);

    // Get OAuth access token
    const accessToken = await getAccessToken(serviceAccount);
    console.log('Successfully obtained access token');
    
    let successCount = 0;
    const failedTokens: string[] = [];

    for (const { token, platform } of tokens) {
      // FCM v1 API message format
      const message: any = {
        message: {
          token,
          notification: { 
            title, 
            body 
          },
          data: data ? Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, String(v)])
          ) : {}
        }
      };

      // Platform-specific options
      if (platform === 'android') {
        message.message.android = { 
          priority: "high",
          notification: {
            sound: "default",
            channel_id: "babagu_notifications"
          }
        };
      } else if (platform === 'ios') {
        message.message.apns = { 
          payload: { 
            aps: { 
              sound: "default", 
              badge: 1 
            } 
          }
        };
      }

      console.log(`Sending to ${platform} device...`);

      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        }
      );

      if (response.ok) {
        successCount++;
        console.log('Successfully sent notification');
      } else {
        const error = await response.json();
        console.error('FCM error:', JSON.stringify(error));
        
        // Check if token is unregistered
        if (error.error?.details?.some((d: any) => 
          d.errorCode === 'UNREGISTERED' || 
          d['@type']?.includes('UNREGISTERED')
        ) || error.error?.code === 404) {
          console.log('Token is unregistered, marking for deactivation');
          failedTokens.push(token);
        }
      }
    }

    // Deactivate invalid tokens
    if (failedTokens.length > 0) {
      console.log(`Deactivating ${failedTokens.length} invalid token(s)`);
      await supabase
        .from('device_tokens')
        .update({ is_active: false })
        .in('token', failedTokens);
    }

    const result = { 
      sent: successCount, 
      failed: failedTokens.length,
      total: tokens.length 
    };
    
    console.log('Result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
