import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  city: string;
}

interface GeocodeResponse {
  latitude: number | null;
  longitude: number | null;
  displayName: string | null;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city } = await req.json() as GeocodeRequest;

    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      console.error('Invalid city parameter:', city);
      return new Response(
        JSON.stringify({ latitude: null, longitude: null, displayName: null, error: 'Invalid city parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const encodedCity = encodeURIComponent(city.trim() + ', Poland');
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedCity}&format=json&limit=1&addressdetails=1`;

    console.log(`Geocoding city: "${city}" -> URL: ${nominatimUrl}`);

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'BaBaGu-App/1.0 (contact@babagu.app)',
        'Accept-Language': 'pl',
      },
    });

    if (!response.ok) {
      console.error('Nominatim API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ latitude: null, longitude: null, displayName: null, error: 'Geocoding service error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    const data = await response.json();
    console.log('Nominatim response:', JSON.stringify(data));

    if (!data || data.length === 0) {
      console.log('No results found for city:', city);
      return new Response(
        JSON.stringify({ latitude: null, longitude: null, displayName: null, error: 'City not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const result = data[0];
    const geocodeResult: GeocodeResponse = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name || null,
    };

    console.log('Geocode success:', geocodeResult);

    return new Response(
      JSON.stringify(geocodeResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Geocode error:', error);
    return new Response(
      JSON.stringify({ latitude: null, longitude: null, displayName: null, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});