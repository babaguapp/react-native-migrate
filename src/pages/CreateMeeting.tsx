import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon, Users, MapPin, FileText } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Activity {
  id: string;
  name: string;
  category_id: string;
}

const formSchema = z.object({
  category_id: z.string().min(1, 'Wybierz kategorię'),
  activity_id: z.string().min(1, 'Wybierz aktywność'),
  city: z.string().min(2, 'Miasto musi mieć min. 2 znaki').max(100, 'Miasto może mieć max. 100 znaków'),
  meeting_date: z.date({ required_error: 'Wybierz datę spotkania' }),
  max_participants: z.number().min(2, 'Min. 2 osoby').max(10, 'Max. 10 osób'),
  gender_preference: z.enum(['female', 'male', 'mixed'], { required_error: 'Wybierz dla kogo jest spotkanie' }),
  description: z.string().max(500, 'Opis może mieć max. 500 znaków').optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateMeeting() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: '',
      activity_id: '',
      city: '',
      max_participants: 4,
      gender_preference: 'mixed',
      description: '',
    },
  });

  const selectedCategoryId = form.watch('category_id');

  useEffect(() => {
    async function fetchData() {
      const [categoriesRes, activitiesRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('activities').select('*').order('name'),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (activitiesRes.data) setActivities(activitiesRes.data);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCategoryId) {
      const filtered = activities.filter(a => a.category_id === selectedCategoryId);
      setFilteredActivities(filtered);
      form.setValue('activity_id', '');
    } else {
      setFilteredActivities([]);
    }
  }, [selectedCategoryId, activities, form]);

  async function onSubmit(values: FormValues) {
    if (!user) {
      toast({
        title: 'Błąd',
        description: 'Musisz być zalogowany, aby utworzyć spotkanie',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Geocode the city to get coordinates
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode', {
          body: { city: values.city.trim() },
        });

        if (!geocodeError && geocodeData?.latitude && geocodeData?.longitude) {
          latitude = geocodeData.latitude;
          longitude = geocodeData.longitude;
        } else {
          console.warn('Geocoding failed:', geocodeError || 'No coordinates returned');
        }
      } catch (geoError) {
        console.warn('Geocoding error:', geoError);
        // Continue without coordinates - meeting will still be created
      }

      const { error } = await supabase.from('meetings').insert({
        creator_id: user.id,
        activity_id: values.activity_id,
        city: values.city.trim(),
        meeting_date: values.meeting_date.toISOString(),
        max_participants: values.max_participants,
        gender_preference: values.gender_preference,
        description: values.description?.trim() || null,
        latitude,
        longitude,
      });

      if (error) throw error;

      toast({
        title: 'Sukces!',
        description: 'Spotkanie zostało utworzone',
      });
      navigate('/meetings');
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się utworzyć spotkania',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <MobileLayout>
      <div className="px-4 py-4 pb-24">
        <h1 className="text-2xl font-bold text-foreground mb-6">Utwórz spotkanie</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Category Select */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Wybierz kategorię" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Activity Select */}
            <FormField
              control={form.control}
              name="activity_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aktywność</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!selectedCategoryId}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={selectedCategoryId ? "Wybierz aktywność" : "Najpierw wybierz kategorię"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50 max-h-60">
                      {filteredActivities.map((act) => (
                        <SelectItem key={act.id} value={act.id}>
                          {act.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* City Input */}
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Miasto
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="np. Warszawa" 
                      {...field} 
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Picker */}
            <FormField
              control={form.control}
              name="meeting_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    Data spotkania
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal bg-background",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: pl })
                          ) : (
                            <span>Wybierz datę</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Max Participants */}
            <FormField
              control={form.control}
              name="max_participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Liczba uczestników (2-10)
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={2} 
                      max={10}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 2)}
                      className="bg-background"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gender Preference */}
            <FormField
              control={form.control}
              name="gender_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dla kogo jest spotkanie?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Wybierz" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="mixed">👥 Wszyscy</SelectItem>
                      <SelectItem value="female">👩 Tylko kobiety</SelectItem>
                      <SelectItem value="male">👨 Tylko mężczyźni</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Opis (opcjonalnie)
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Opisz szczegóły spotkania..."
                      className="bg-background resize-none min-h-[100px]"
                      maxLength={500}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground text-right">
                    {field.value?.length || 0}/500
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
              disabled={isLoading}
            >
              {isLoading ? 'Tworzenie...' : 'Utwórz spotkanie'}
            </Button>
          </form>
        </Form>
      </div>
    </MobileLayout>
  );
}
