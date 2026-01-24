import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { MeetingCard } from '@/components/meetings/MeetingCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Search, CalendarIcon, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Category {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  category_id: string;
}

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

export default function SearchMeetings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Filter states
  const [city, setCity] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedActivity, setSelectedActivity] = useState<string>('');

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch categories and activities on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, activitiesRes] = await Promise.all([
          supabase.from('categories').select('id, name').order('name'),
          supabase.from('activities').select('id, name, category_id').order('name'),
        ]);

        if (categoriesRes.data) setCategories(categoriesRes.data);
        if (activitiesRes.data) setActivities(activitiesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Filter activities when category changes
  useEffect(() => {
    if (selectedCategory) {
      setFilteredActivities(activities.filter(a => a.category_id === selectedCategory));
      setSelectedActivity(''); // Reset activity when category changes
    } else {
      setFilteredActivities(activities);
    }
  }, [selectedCategory, activities]);

  const canSearch = city.trim() && dateRange?.from && dateRange?.to;

  const handleSearch = async () => {
    if (!canSearch) {
      toast({
        title: 'Uzupełnij wymagane pola',
        description: 'Miasto i zakres dat są wymagane',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('meetings')
        .select(`
          id,
          max_participants,
          meeting_date,
          city,
          image_url,
          activity_id,
          activities!inner (
            id,
            name,
            category_id,
            categories!inner (
              id,
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
        .ilike('city', `%${city.trim()}%`)
        .gte('meeting_date', dateRange.from!.toISOString())
        .lte('meeting_date', dateRange.to!.toISOString())
        .order('meeting_date', { ascending: true });

      // Add category filter if selected
      if (selectedCategory) {
        query = query.eq('activities.category_id', selectedCategory);
      }

      // Add activity filter if selected
      if (selectedActivity) {
        query = query.eq('activity_id', selectedActivity);
      }

      const { data, error } = await query;

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
      console.error('Error searching meetings:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wyszukać spotkań',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setCity('');
    setDateRange(undefined);
    setSelectedCategory('');
    setSelectedActivity('');
    setMeetings([]);
    setHasSearched(false);
  };

  return (
    <MobileLayout title="Szukaj spotkań" showBack>
      <div className="px-4 py-4 pb-24">
        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* City - required */}
          <div className="space-y-2">
            <Label htmlFor="city" className="flex items-center gap-1">
              Miasto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              placeholder="Wpisz miasto..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          {/* Date Range - required */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Zakres dat <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dateRange && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'd MMM', { locale: pl })} -{' '}
                        {format(dateRange.to, 'd MMM yyyy', { locale: pl })}
                      </>
                    ) : (
                      format(dateRange.from, 'd MMM yyyy', { locale: pl })
                    )
                  ) : (
                    <span>Wybierz zakres dat</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                  disabled={(date) => date < new Date()}
                  className={cn('p-3 pointer-events-auto')}
                  locale={pl}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category - optional */}
          <div className="space-y-2">
            <Label>Kategoria</Label>
            <Select 
              value={selectedCategory || "all"} 
              onValueChange={(val) => setSelectedCategory(val === 'all' ? '' : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wszystkie kategorie" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                <SelectItem value="all">Wszystkie kategorie</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity - optional, depends on category */}
          <div className="space-y-2">
            <Label>Aktywność {!selectedCategory && <span className="text-xs text-muted-foreground">(wybierz najpierw kategorię)</span>}</Label>
            <Select 
              value={selectedActivity || "all"} 
              onValueChange={(val) => setSelectedActivity(val === 'all' ? '' : val)}
              disabled={isLoadingData || !selectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wszystkie aktywności" />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border shadow-lg z-50">
                <SelectItem value="all">Wszystkie aktywności</SelectItem>
                {filteredActivities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={clearFilters}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Wyczyść
            </Button>
            <Button
              onClick={handleSearch}
              disabled={!canSearch || isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Szukaj
            </Button>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Szukam spotkań...</p>
          </div>
        ) : hasSearched ? (
          meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Brak spotkań spełniających kryteria.
              </p>
              <Button
                onClick={() => navigate('/create')}
                variant="secondary"
              >
                Utwórz spotkanie
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Znaleziono {meetings.length} {meetings.length === 1 ? 'spotkanie' : meetings.length < 5 ? 'spotkania' : 'spotkań'}
              </p>
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Uzupełnij filtry i kliknij "Szukaj"
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
