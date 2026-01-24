import { useState, useEffect } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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
}

export default function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const { toast } = useToast();
  const navigate = useNavigate();

  const requestLocationPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'granted') {
        setLocationStatus('granted');
        return true;
      }
      
      return new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            setLocationStatus('granted');
            resolve(true);
          },
          () => {
            setLocationStatus('denied');
            toast({
              title: 'Lokalizacja wymagana',
              description: 'Aby zobaczyć spotkania w pobliżu, włącz dostęp do lokalizacji.',
              variant: 'destructive',
            });
            resolve(false);
          }
        );
      });
    } catch (error) {
      setLocationStatus('denied');
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: 'Powiadomienia włączone',
          description: 'Będziesz otrzymywać powiadomienia o nowych spotkaniach.',
        });
      }
    }
  };

  const fetchMeetings = async () => {
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
        current_participants: meeting.meeting_participants.filter((p: any) => p.status === 'accepted').length + 1, // +1 for creator
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
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      await requestLocationPermission();
      await requestNotificationPermission();
      await fetchMeetings();
    };

    initApp();
  }, []);

  return (
    <MobileLayout>
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Blisko Ciebie:</h1>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Ładowanie spotkań...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">Brak spotkań w pobliżu.</p>
            <Button 
              onClick={fetchMeetings}
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
              <Button 
                onClick={() => navigate('/create')}
                className="bg-secondary hover:bg-secondary/90"
              >
                Utwórz
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <MeetingCard 
                key={meeting.id} 
                meeting={meeting}
                onClick={() => navigate(`/meeting/${meeting.id}`)}
              />
            ))}

            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-2">
                Brak spotkań w Twoim mieście?
              </p>
              <p className="font-bold text-foreground mb-1">
                Utwórz teraz i pomóż nam wypromować apkę!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Tworząc spotkanie, w którym inni wezmą udział - zagrasz o nagrodę 1000 zł!
              </p>
              <Button 
                onClick={() => navigate('/create')}
                className="bg-secondary hover:bg-secondary/90"
              >
                Utwórz
              </Button>
            </div>
          </div>
        )}

        {/* Floating search button */}
        <Button
          className="fixed bottom-24 right-4 bg-secondary hover:bg-secondary/90 shadow-lg rounded-full px-6"
          onClick={() => navigate('/search')}
        >
          <Search className="w-5 h-5 mr-2" />
          Szukaj spotkań
        </Button>
      </div>
    </MobileLayout>
  );
}
