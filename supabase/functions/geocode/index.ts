import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeocodeRequest {
  city?: string;
  query?: string;
  mode?: 'city' | 'search';
}

interface AddressResult {
  displayName: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface GeocodeResponse {
  latitude?: number | null;
  longitude?: number | null;
  displayName?: string | null;
  results?: AddressResult[];
  error?: string;
}

// Extract city name from Nominatim address details
function extractCity(addressDetails: Record<string, string> | undefined): string {
  if (!addressDetails) return '';
  
  // Priority order for city extraction
  return addressDetails.city || 
         addressDetails.town || 
         addressDetails.village || 
         addressDetails.municipality ||
         addressDetails.county ||
         '';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as GeocodeRequest;
    const { city, query, mode } = body;

    // Determine if this is a search (multiple results) or single city geocode
    const isSearch = mode === 'search' || !!query;
    const searchQuery = query || city;

    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length < 2) {
      console.error('Invalid query parameter:', searchQuery);
      return new Response(
        JSON.stringify({ 
          latitude: null, 
          longitude: null, 
          displayName: null, 
          results: [],
          error: 'Invalid query parameter' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build Nominatim URL - limit to Poland for better results
    const encodedQuery = encodeURIComponent(searchQuery.trim());
    const limit = isSearch ? 5 : 1;
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=${limit}&addressdetails=1&countrycodes=pl`;

    console.log(`Geocoding query: "${searchQuery}" (mode: ${isSearch ? 'search' : 'city'}) -> URL: ${nominatimUrl}`);

    // Retry with exponential backoff to handle Nominatim rate limiting (429)
    let response: Response | null = null;
    let lastStatus = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
      response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'BaBaGu-App/1.0 (contact@babagu.app)',
          'Accept-Language': 'pl',
          'Referer': 'https://babagu.app',
        },
      });
      lastStatus = response.status;
      if (response.ok) break;
      if (response.status !== 429 && response.status < 500) break;
      console.warn(`Nominatim attempt ${attempt + 1} failed with ${response.status}, retrying...`);
    }

    if (!response || !response.ok) {
      console.error('Nominatim API error after retries:', lastStatus);
      // Return 200 with empty results so client doesn't break the UX flow
      return new Response(
        JSON.stringify({ 
          latitude: null, 
          longitude: null, 
          displayName: null, 
          results: [],
          error: lastStatus === 429 ? 'Rate limit exceeded, try again' : 'Geocoding service error' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data = await response.json();
    console.log('Nominatim response:', JSON.stringify(data));

    if (!data || data.length === 0) {
      console.log('No results found for query:', searchQuery);
      // Return 200 with empty results instead of 404 to avoid client-side errors
      return new Response(
        JSON.stringify({ 
          latitude: null, 
          longitude: null, 
          displayName: null, 
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If search mode, return multiple results
    if (isSearch) {
      const results: AddressResult[] = data.map((item: any) => ({
        displayName: item.display_name || '',
        city: extractCity(item.address),
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
      }));

      console.log('Search results:', results.length);

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single result mode (backwards compatible)
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
      JSON.stringify({ 
        latitude: null, 
        longitude: null, 
        displayName: null, 
        results: [],
        error: 'Internal server error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
