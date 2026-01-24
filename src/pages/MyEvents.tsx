import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MyEventCard } from '@/components/meetings/MyEventCard';
import { Loader2 } from 'lucide-react';

interface MyEvent {
  id: string;
  activity_name: string;
  category_name: string;
  creator_username: string;
  creator_id: string;
  current_participants: number;
  max_participants: number;
  meeting_date: string;
  city: string;
  image_url?: string | null;
}

export default function MyEvents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState<MyEvent[]>([]);
  const [pastEvents, setPastEvents] = useState<MyEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyEvents();
    }
  }, [user]);

  async function fetchMyEvents() {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const now = new Date().toISOString();

      // Fetch meetings I created
      const { data: createdMeetings, error: createdError } = await supabase
        .from('meetings')
        .select(`
          id,
          max_participants,
          meeting_date,
          city,
          image_url,
          creator_id,
          activities!inner(name, categories!inner(name)),
          profiles!inner(username),
          meeting_participants(id, status)
        `)
        .eq('creator_id', user.id)
        .order('meeting_date', { ascending: true });

      if (createdError) throw createdError;

      // Fetch meetings I'm participating in
      const { data: participatingMeetings, error: participatingError } = await supabase
        .from('meeting_participants')
        .select(`
          meeting_id,
          meetings!inner(
            id,
            max_participants,
            meeting_date,
            city,
            image_url,
            creator_id,
            activities!inner(name, categories!inner(name)),
            profiles!inner(username),
            meeting_participants(id, status)
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (participatingError) throw participatingError;

      // Format created meetings
      const formattedCreated: MyEvent[] = (createdMeetings || []).map((m: any) => ({
        id: m.id,
        activity_name: m.activities.name,
        category_name: m.activities.categories.name,
        creator_username: m.profiles.username,
        creator_id: m.creator_id,
        current_participants: m.meeting_participants?.filter((p: any) => p.status === 'accepted').length || 0,
        max_participants: m.max_participants,
        meeting_date: m.meeting_date,
        city: m.city,
        image_url: m.image_url,
      }));

      // Format participating meetings (exclude ones I created)
      const formattedParticipating: MyEvent[] = (participatingMeetings || [])
        .filter((p: any) => p.meetings.creator_id !== user.id)
        .map((p: any) => ({
          id: p.meetings.id,
          activity_name: p.meetings.activities.name,
          category_name: p.meetings.activities.categories.name,
          creator_username: p.meetings.profiles.username,
          creator_id: p.meetings.creator_id,
          current_participants: p.meetings.meeting_participants?.filter((mp: any) => mp.status === 'accepted').length || 0,
          max_participants: p.meetings.max_participants,
          meeting_date: p.meetings.meeting_date,
          city: p.meetings.city,
          image_url: p.meetings.image_url,
        }));

      // Combine and deduplicate
      const allEvents = [...formattedCreated, ...formattedParticipating];
      const uniqueEvents = allEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      // Split into upcoming and past
      const upcoming = uniqueEvents
        .filter(e => new Date(e.meeting_date) >= new Date())
        .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
      
      const past = uniqueEvents
        .filter(e => new Date(e.meeting_date) < new Date())
        .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());

      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (error) {
      console.error('Error fetching my events:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const isOrganizer = (event: MyEvent) => event.creator_id === user?.id;

  return (
    <MobileLayout>
      <div className="px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-4">Moje wydarzenia</h1>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="upcoming">Nadchodzące</TabsTrigger>
            <TabsTrigger value="past">Zakończone</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nie masz żadnych nadchodzących wydarzeń.</p>
                <p className="text-sm mt-2">Dołącz do spotkania lub utwórz własne!</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <MyEventCard
                  key={event.id}
                  meeting={event}
                  badge={isOrganizer(event) ? 'Organizujesz' : 'Bierzesz udział'}
                  badgeVariant={isOrganizer(event) ? 'organizer' : 'participant'}
                  onClick={() => navigate(`/meeting/${event.id}`)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : pastEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nie masz żadnych zakończonych wydarzeń.</p>
              </div>
            ) : (
              pastEvents.map((event) => (
                <MyEventCard
                  key={event.id}
                  meeting={event}
                  badge={isOrganizer(event) ? 'Organizowałeś' : 'Brałeś udział'}
                  badgeVariant={isOrganizer(event) ? 'organizer' : 'participant'}
                  isPast
                  onClick={() => navigate(`/meeting/${event.id}`)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
