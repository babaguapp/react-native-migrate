-- Function to calculate distance between two points using Haversine formula (returns km)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
DECLARE
  r double precision := 6371; -- Earth's radius in km
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN r * c;
END;
$$;

-- Function to get meetings within a radius (in km)
CREATE OR REPLACE FUNCTION public.get_meetings_within_radius(
  user_lat double precision,
  user_lon double precision,
  radius_km double precision DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  creator_id uuid,
  activity_id uuid,
  city text,
  meeting_date timestamptz,
  max_participants integer,
  gender_preference text,
  description text,
  image_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz,
  updated_at timestamptz,
  distance_km double precision
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.creator_id,
    m.activity_id,
    m.city,
    m.meeting_date,
    m.max_participants,
    m.gender_preference,
    m.description,
    m.image_url,
    m.latitude,
    m.longitude,
    m.created_at,
    m.updated_at,
    public.calculate_distance(user_lat, user_lon, m.latitude, m.longitude) as distance_km
  FROM public.meetings m
  WHERE 
    m.latitude IS NOT NULL 
    AND m.longitude IS NOT NULL
    AND m.meeting_date > now()
    AND public.calculate_distance(user_lat, user_lon, m.latitude, m.longitude) <= radius_km
  ORDER BY distance_km ASC;
END;
$$;