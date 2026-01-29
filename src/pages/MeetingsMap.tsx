import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RefreshCw, List, MapPin } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useGeolocation } from '@/hooks/useGeolocation';
import { InlineLocationPrompt } from '@/components/location/InlineLocationPrompt';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet with Vite
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom user location icon
const UserLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `<div style="width: 16px; height: 16px; background: hsl(var(--primary)); border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface MapMeeting {
  id: string;
  activity_name: string;
  category_name: string;
  creator_username: string;
  current_participants: number;
  max_participants: number;
  meeting_date: string;
  city: string;
  address: string | null;
  latitude: number;
  longitude: number;
  distance_km: number;
}

// Component to recenter map when user location changes
function MapRecenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon], map.getZoom());
  }, [lat, lon, map]);
  return null;
}

export default function MeetingsMap() {
  const [meetings, setMeetings] = useState<MapMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    latitude, 
    longitude, 
    hasLocation, 
    setManualLocation,
    loading: geoLoading 
  } = useGeolocation();

  // Default center (Poland)
  const defaultCenter: [number, number] = [52.0693, 19.4803];
  const mapCenter = useMemo<[number, number]>(() => 
    hasLocation && latitude && longitude 
      ? [latitude, longitude] 
      : defaultCenter,
    [hasLocation, latitude, longitude]
  );

  const fetchMeetings = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      // Get meetings within 100km radius
      const { data: radiusData, error: radiusError } = await supabase.rpc('get_meetings_within_radius', {
        user_lat: lat,
        user_lon: lon,
        radius_km: 100
      });

      if (radiusError) throw radiusError;

      const meetingIds = (radiusData || []).map((m: any) => m.id);
      
      if (meetingIds.length === 0) {
        setMeetings([]);
        return;
      }

      // Fetch detailed meeting data
      const { data: detailedMeetings, error: detailsError } = await supabase
        .from('meetings')
        .select(`
          id,
          max_participants,
          meeting_date,
          city,
          address,
          latitude,
          longitude,
          activities!inner (
            name,
            categories!inner (
              name
            )
          ),
          profiles!inner (
            username
          ),
          meeting_participants (
            id,
            status
          )
        `)
        .in('id', meetingIds);

      if (detailsError) throw detailsError;

      // Merge distance data with detailed data
      const distanceMap = new Map((radiusData || []).map((m: any) => [m.id, m.distance_km]));

      const formattedMeetings: MapMeeting[] = (detailedMeetings || [])
        .filter((m: any) => m.latitude && m.longitude) // Only meetings with coordinates
        .map((meeting: any) => ({
          id: meeting.id,
          activity_name: meeting.activities.name,
          category_name: meeting.activities.categories.name,
          creator_username: meeting.profiles.username,
          current_participants: meeting.meeting_participants.filter((p: any) => p.status === 'accepted').length + 1,
          max_participants: meeting.max_participants,
          meeting_date: meeting.meeting_date,
          city: meeting.city,
          address: meeting.address,
          latitude: meeting.latitude,
          longitude: meeting.longitude,
          distance_km: distanceMap.get(meeting.id) || 0,
        }));

      setMeetings(formattedMeetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać spotkań.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check location and fetch meetings
  useEffect(() => {
    if (geoLoading) return;
    
    if (hasLocation && latitude && longitude) {
      fetchMeetings(latitude, longitude);
    } else {
      setShowLocationPrompt(true);
      setIsLoading(false);
    }
  }, [geoLoading, hasLocation, latitude, longitude]);

  const handleLocationSet = (lat: number, lon: number) => {
    setManualLocation(lat, lon);
    setShowLocationPrompt(false);
    fetchMeetings(lat, lon);
  };

  const handleSkipLocation = () => {
    setShowLocationPrompt(false);
    // Fetch all meetings for Poland center
    fetchMeetings(defaultCenter[0], defaultCenter[1]);
  };

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${Math.round(km)} km`;
  };

  return (
    <MobileLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Mapa spotkań</h1>
          <div className="flex items-center gap-2">
            {hasLocation && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLocationPrompt(true)}
              >
                <MapPin className="h-4 w-4 mr-1" />
                Zmień
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/meetings')}
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
          </div>
        </div>

        {/* Location prompt */}
        {showLocationPrompt && (
          <div className="px-4 py-2">
            <InlineLocationPrompt
              onLocationSet={handleLocationSet}
              onSkip={handleSkipLocation}
            />
          </div>
        )}

        {/* Map or loading state */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Ładowanie mapy...</p>
          </div>
        ) : (
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={hasLocation ? 11 : 6}
              className="h-full w-full z-0"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {hasLocation && latitude && longitude && (
                <MapRecenter lat={latitude} lon={longitude} />
              )}

              {/* User location marker */}
              {hasLocation && latitude && longitude && (
                <Marker 
                  position={[latitude, longitude]}
                  icon={UserLocationIcon}
                >
                  <Popup>
                    <span className="font-medium">Twoja lokalizacja</span>
                  </Popup>
                </Marker>
              )}

              {/* Meeting markers */}
              {meetings.map((meeting) => (
                <Marker
                  key={meeting.id}
                  position={[meeting.latitude, meeting.longitude]}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-bold text-foreground mb-1">
                        {meeting.activity_name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {meeting.category_name}
                      </p>
                      
                      <div className="space-y-1 text-sm">
                        <p>
                          📅 {format(new Date(meeting.meeting_date), 'd MMM yyyy, HH:mm', { locale: pl })}
                        </p>
                        <p>
                          📍 {meeting.address ? meeting.address.split(',')[0] : meeting.city}
                        </p>
                        <p>
                          👥 {meeting.current_participants}/{meeting.max_participants}
                        </p>
                        <p className="text-muted-foreground">
                          🚶 {formatDistance(meeting.distance_km)}
                        </p>
                      </div>
                      
                      <Button
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => navigate(`/meeting/${meeting.id}`)}
                      >
                        Zobacz szczegóły
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Meeting count badge */}
            <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg z-[1000]">
              <span className="text-sm font-medium">
                {meetings.length} {meetings.length === 1 ? 'spotkanie' : 'spotkań'}
              </span>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
