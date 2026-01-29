import { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, MapPin, Map as MapIcon } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '@/hooks/useGeolocation';
import { InlineLocationPrompt } from '@/components/location/InlineLocationPrompt';

interface Meeting {
  id: string;
  activity_name: string;
  category_name: string;
  creator_username: string;
  current_participants: number;
  max_participants: number;
  meeting_date: string;
  city: string;
  image_url: string | null;
  distance_km?: number;
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationChecked, setLocationChecked] = useState(false);
  const [showFloatingButtons, setShowFloatingButtons] = useState(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    latitude, 
    longitude, 
    hasLocation, 
    setManualLocation,
    requestLocation,
    loading: geoLoading,
    permissionDenied,
    shouldShowPrompt,
    markPromptShown,
    initialized: geoInitialized
  } = useGeolocation();

  // Handle scroll to hide/show floating buttons
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingButtons(false);
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setShowFloatingButtons(true);
      }, 300);
    };

    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const requestNotificationPermission = async () => {
    // In native (Capacitor) builds, use the PushNotifications plugin flow.
    // Calling the Web Notifications API in Android WebView can lead to crashes on some devices.
    if (Capacitor.isNativePlatform()) return;

    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: 'Powiadomienia włączone',
          description: 'Będziesz otrzymywać powiadomienia o nowych spotkaniach.'
        });
      }
    }
  };

  const fetchMeetingsWithLocation = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      // Use the database function for radius filtering
      const { data, error } = await supabase.rpc('get_meetings_within_radius', {
        user_lat: lat,
        user_lon: lon,
        radius_km: 100
      });

      if (error) throw error;

      // Now we need to fetch additional data (activity names, creator, participants)
      const meetingIds = (data || []).map((m: any) => m.id);
      
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
          image_url,
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
      const distanceMap = new Map((data || []).map((m: any) => [m.id, m.distance_km]));

      const formattedMeetings: Meeting[] = (detailedMeetings || []).map((meeting: any) => ({
        id: meeting.id,
        activity_name: meeting.activities.name,
        category_name: meeting.activities.categories.name,
        creator_username: meeting.profiles.username,
        current_participants: meeting.meeting_participants.filter((p: any) => p.status === 'accepted').length + 1,
        max_participants: meeting.max_participants,
        meeting_date: meeting.meeting_date,
        city: meeting.city,
        image_url: meeting.image_url,
        distance_km: distanceMap.get(meeting.id) || null,
      }));

      // Sort by distance
      formattedMeetings.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

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

  const fetchAllMeetings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select(`
          id,
          max_participants,
          meeting_date,
          city,
          image_url,
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
        .gte('meeting_date', new Date().toISOString())
        .order('meeting_date', { ascending: true });

      if (error) throw error;

      const formattedMeetings: Meeting[] = (data || []).map((meeting: any) => ({
        id: meeting.id,
        activity_name: meeting.activities.name,
        category_name: meeting.activities.categories.name,
        creator_username: meeting.profiles.username,
        current_participants: meeting.meeting_participants.filter((p: any) => p.status === 'accepted').length + 1,
        max_participants: meeting.max_participants,
        meeting_date: meeting.meeting_date,
        city: meeting.city,
        image_url: meeting.image_url,
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

  // Initial load - request notification permission once
  useEffect(() => {
    const requestNotifications = async () => {
      try {
        await requestNotificationPermission();
      } catch (e) {
        console.warn('Notification permission not available:', e);
      }
    };
    requestNotifications();
  }, []);

  // Check location status after hook initializes
  useEffect(() => {
    // Wait for geolocation hook to initialize
    if (!geoInitialized || geoLoading) return;
    
    // Only check once per mount
    if (locationChecked) return;
    setLocationChecked(true);

    if (hasLocation && latitude && longitude) {
      // User already has location - fetch meetings
      fetchMeetingsWithLocation(latitude, longitude);
    } else if (shouldShowPrompt()) {
      // No location and should show prompt
      setShowLocationPrompt(true);
      markPromptShown();
    } else {
      // Already prompted or has granted permission, fetch all meetings
      fetchAllMeetings();
    }
  }, [geoInitialized, geoLoading, hasLocation, latitude, longitude, locationChecked]);

  // Re-fetch when location changes
  useEffect(() => {
    if (hasLocation && latitude && longitude && !geoLoading && locationChecked) {
      fetchMeetingsWithLocation(latitude, longitude);
    }
  }, [hasLocation, latitude, longitude, geoLoading, locationChecked]);

  const handleLocationSet = (lat: number, lon: number) => {
    setManualLocation(lat, lon);
    setShowLocationPrompt(false);
  };

  const handleSkipLocation = () => {
    setShowLocationPrompt(false);
    fetchAllMeetings();
  };

  const formatDistance = (km: number | undefined) => {
    if (!km) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${Math.round(km)} km`;
  };

  return (
    <MobileLayout>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">
            {hasLocation ? 'Blisko Ciebie:' : 'Wszystkie spotkania:'}
          </h1>
          {hasLocation && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLocationPrompt(true)}
              className="text-muted-foreground"
            >
              <MapPin className="h-4 w-4 mr-1" />
              Zmień
            </Button>
          )}
        </div>

        {/* Inline location prompt - no Dialog/Portal to avoid WebView crashes */}
        {showLocationPrompt && (
          <InlineLocationPrompt
            onLocationSet={handleLocationSet}
            onSkip={handleSkipLocation}
          />
        )}

        {!hasLocation && !showLocationPrompt && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
            <p className="text-sm text-foreground mb-2">
              📍 Włącz lokalizację, aby zobaczyć spotkania w promieniu 100 km
            </p>
            <Button
              size="sm"
              onClick={() => setShowLocationPrompt(true)}
              className="w-full"
            >
              Ustaw lokalizację
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Ładowanie spotkań...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {hasLocation ? 'Brak spotkań w promieniu 100 km.' : 'Brak dostępnych spotkań.'}
            </p>
            <Button 
              onClick={() => hasLocation && latitude && longitude 
                ? fetchMeetingsWithLocation(latitude, longitude) 
                : fetchAllMeetings()
              } 
              className="bg-secondary hover:bg-secondary/90"
            >
              Odśwież
            </Button>

            <div className="mt-8">
              <p className="text-muted-foreground mb-2">
                Brak spotkań w Twoim mieście?
              </p>
              <p className="font-bold text-foreground mb-1">
                Utwórz teraz i pomóż nam wypromować apkę!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Tworząc spotkanie, w którym inni wezmą udział - zagrasz o nagrodę 1000 zł!
              </p>
              <Button onClick={() => navigate('/create')} className="bg-secondary hover:bg-secondary/90">
                Utwórz
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map(meeting => (
              <div key={meeting.id} className="relative">
                <MeetingCard 
                  meeting={meeting} 
                  onClick={() => navigate(`/meeting/${meeting.id}`)} 
                />
                {meeting.distance_km !== undefined && (
                  <div className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {formatDistance(meeting.distance_km)}
                  </div>
                )}
              </div>
            ))}

            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-2">
                Brak spotkań w Twoim mieście?
              </p>
              <p className="font-bold text-foreground mb-1 text-sm">
                Utwórz teraz i pomóż nam wypromować apkę!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Tworząc spotkanie, w którym inni wezmą udział - zagrasz o nagrodę 1000 zł!
              </p>
              <Button onClick={() => navigate('/create')} className="bg-secondary hover:bg-secondary/90">
                Utwórz
              </Button>
            </div>
          </div>
        )}

        {/* Floating buttons */}
        <div 
          className={`fixed bottom-24 right-2 flex flex-col gap-2 transition-opacity duration-200 ${
            showFloatingButtons ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Button 
            className="bg-primary hover:bg-primary/90 shadow-lg rounded-full w-14 h-14 p-0" 
            onClick={() => navigate('/map')}
          >
            <MapIcon className="w-7 h-7" />
          </Button>
          <Button 
            className="bg-secondary hover:bg-secondary/90 shadow-lg rounded-full px-6" 
            onClick={() => navigate('/search')}
          >
            <Search className="w-5 h-5 mr-2" />
            Szukaj
          </Button>
        </div>
      </div>

      {/* LocationPrompt Dialog removed - using InlineLocationPrompt instead to avoid WebView crashes */}
    </MobileLayout>
  );
}