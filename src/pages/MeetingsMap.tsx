import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

// Category to emoji mapping
const categoryEmojis: Record<string, string> = {
  'sport': '⚽',
  'muzyka': '🎵',
  'sztuka': '🎨',
  'jedzenie': '🍕',
  'gry': '🎮',
  'nauka': '📚',
  'podróże': '✈️',
  'zdrowie': '💪',
  'imprezy': '🎉',
  'wolontariat': '🤝',
  'hobby': '🎯',
  'kultura': '🎭',
  'default': '📍'
};

const getCategoryEmoji = (categoryName: string): string => {
  const normalized = categoryName.toLowerCase();
  for (const [key, emoji] of Object.entries(categoryEmojis)) {
    if (normalized.includes(key)) {
      return emoji;
    }
  }
  return categoryEmojis.default;
};

const createEmojiIcon = (categoryName: string) => {
  const emoji = getCategoryEmoji(categoryName);
  return L.divIcon({
    className: 'emoji-marker',
    html: `<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

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

export default function MeetingsMap() {
  const [meetings, setMeetings] = useState<MapMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const center = hasLocation && latitude && longitude 
      ? [latitude, longitude] as [number, number]
      : defaultCenter;

    const map = L.map(mapContainerRef.current).setView(center, hasLocation ? 11 : 6);
    
    // Using CartoDB Positron for a cleaner, less technical look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map center when location changes
  useEffect(() => {
    if (!mapRef.current || !hasLocation || !latitude || !longitude) return;
    mapRef.current.setView([latitude, longitude], 11);
  }, [hasLocation, latitude, longitude]);

  // Add user location marker
  useEffect(() => {
    if (!mapRef.current || !hasLocation || !latitude || !longitude) return;

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="width: 16px; height: 16px; background: #3b82f6; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const userMarker = L.marker([latitude, longitude], { icon: userIcon })
      .addTo(mapRef.current)
      .bindPopup('<span class="font-medium">Twoja lokalizacja</span>');

    return () => {
      userMarker.remove();
    };
  }, [hasLocation, latitude, longitude, mapReady]);

  // Add meeting markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    meetings.forEach(meeting => {
      const popupContent = `
        <div style="min-width: 180px;">
          <h3 style="font-weight: bold; margin-bottom: 4px;">${meeting.activity_name}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${meeting.category_name}</p>
          <div style="font-size: 13px; line-height: 1.6;">
            <p>📅 ${format(new Date(meeting.meeting_date), 'd MMM yyyy, HH:mm', { locale: pl })}</p>
            <p>📍 ${meeting.address ? meeting.address.split(',')[0] : meeting.city}</p>
            <p>👥 ${meeting.current_participants}/${meeting.max_participants}</p>
            <p style="color: #666;">🚶 ${formatDistance(meeting.distance_km)}</p>
          </div>
          <button 
            onclick="window.location.href='/meeting/${meeting.id}'"
            style="width: 100%; margin-top: 12px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            Zobacz szczegóły
          </button>
        </div>
      `;

      const emojiIcon = createEmojiIcon(meeting.category_name);
      const marker = L.marker([meeting.latitude, meeting.longitude], { icon: emojiIcon })
        .addTo(mapRef.current!)
        .bindPopup(popupContent);

      markersRef.current.push(marker);
    });
  }, [meetings, mapReady]);

  const formatDistance = (km: number) => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${Math.round(km)} km`;
  };

  const fetchMeetings = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
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

      const distanceMap = new Map((radiusData || []).map((m: any) => [m.id, m.distance_km]));

      const formattedMeetings: MapMeeting[] = (detailedMeetings || [])
        .filter((m: any) => m.latitude && m.longitude)
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
    fetchMeetings(defaultCenter[0], defaultCenter[1]);
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

        {/* Map */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-[1001]">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Ładowanie mapy...</p>
            </div>
          )}
          
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Meeting count badge */}
          <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg z-[1000]">
            <span className="text-sm font-medium">
              {meetings.length} {meetings.length === 1 ? 'spotkanie' : 'spotkań'}
            </span>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
