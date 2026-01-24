import { useState, useEffect } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface InlineLocationPromptProps {
  onLocationSet: (latitude: number, longitude: number) => void;
  onSkip: () => void;
}

export function InlineLocationPrompt({ onLocationSet, onSkip }: InlineLocationPromptProps) {
  const { 
    requestLocation, 
    loading: gpsLoading, 
    error: gpsError, 
    permissionDenied,
    latitude,
    longitude,
    hasLocation
  } = useGeolocation();
  const { toast } = useToast();
  const [manualCity, setManualCity] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [gpsRequested, setGpsRequested] = useState(false);

  // Watch for location changes after GPS request
  useEffect(() => {
    if (gpsRequested && hasLocation && latitude && longitude && !gpsLoading) {
      onLocationSet(latitude, longitude);
      toast({
        title: 'Lokalizacja pobrana',
        description: 'Twoja lokalizacja została ustawiona',
      });
      setGpsRequested(false);
    }
  }, [gpsRequested, hasLocation, latitude, longitude, gpsLoading, onLocationSet, toast]);

  // Show manual input if permission was denied
  useEffect(() => {
    if (permissionDenied && gpsRequested) {
      setShowManualInput(true);
      setGpsRequested(false);
    }
  }, [permissionDenied, gpsRequested]);

  const handleGpsRequest = () => {
    setGpsRequested(true);
    requestLocation();
  };

  const handleManualCity = async () => {
    if (!manualCity.trim()) return;

    setGeocoding(true);
    try {
      const { data, error } = await supabase.functions.invoke('geocode', {
        body: { city: manualCity.trim() },
      });

      if (error) throw error;

      if (data.latitude && data.longitude) {
        onLocationSet(data.latitude, data.longitude);
        toast({
          title: 'Miasto ustawione',
          description: `Ustawiono lokalizację: ${manualCity}`,
        });
      } else {
        toast({
          title: 'Nie znaleziono',
          description: 'Nie udało się znaleźć tego miasta. Spróbuj inaczej.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Geocoding error:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się wyszukać miasta',
        variant: 'destructive',
      });
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <Card className="mb-4 border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-primary" />
          Ustaw swoją lokalizację
        </CardTitle>
        <CardDescription>
          Aby zobaczyć spotkania w promieniu 100 km od Ciebie
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {!showManualInput && !permissionDenied && (
          <>
            <Button
              onClick={handleGpsRequest}
              disabled={gpsLoading}
              className="w-full flex items-center gap-2"
              size="default"
            >
              <Navigation className="h-5 w-5" />
              {gpsLoading ? 'Pobieranie lokalizacji...' : 'Użyj mojej lokalizacji GPS'}
            </Button>

            {gpsError && (
              <p className="text-sm text-destructive text-center">{gpsError}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowManualInput(true)}
                className="flex-1"
                size="sm"
              >
                Wpisz miasto
              </Button>
              <Button
                variant="ghost"
                onClick={onSkip}
                className="flex-1 text-muted-foreground"
                size="sm"
              >
                Pomiń
              </Button>
            </div>
          </>
        )}

        {(showManualInput || permissionDenied) && (
          <div className="space-y-3">
            {permissionDenied && (
              <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
                <p>Dostęp do GPS został zablokowany. Możesz wprowadzić swoje miasto ręcznie.</p>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                placeholder="Wpisz nazwę miasta..."
                value={manualCity}
                onChange={(e) => setManualCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualCity()}
                disabled={geocoding}
              />
              <Button
                onClick={handleManualCity}
                disabled={geocoding || !manualCity.trim()}
                size="icon"
              >
                {geocoding ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="flex gap-2">
              {!permissionDenied && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(false)}
                  className="flex-1 text-muted-foreground"
                >
                  ← Wróć do GPS
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onSkip}
                className="flex-1 text-muted-foreground"
              >
                Pomiń
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
