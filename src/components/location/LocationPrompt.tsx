import { useState } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGeolocation } from '@/hooks/useGeolocation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LocationPromptProps {
  open: boolean;
  onClose: () => void;
  onLocationSet: (latitude: number, longitude: number) => void;
}

export function LocationPrompt({ open, onClose, onLocationSet }: LocationPromptProps) {
  const { requestLocation, loading: gpsLoading, error: gpsError, permissionDenied } = useGeolocation();
  const { toast } = useToast();
  const [manualCity, setManualCity] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  // Reset state when dialog closes
  const handleClose = () => {
    setManualCity('');
    setShowManualInput(false);
    setGeocoding(false);
    onClose();
  };

  const handleGpsRequest = () => {
    requestLocation();
    
    // We need to wait for the state to update, so we use a callback approach
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationSet(position.coords.latitude, position.coords.longitude);
        handleClose();
        toast({
          title: 'Lokalizacja pobrana',
          description: 'Twoja lokalizacja została ustawiona',
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setShowManualInput(true);
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
        handleClose();
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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Ustaw swoją lokalizację
          </DialogTitle>
          <DialogDescription>
            Potrzebujemy Twojej lokalizacji, aby pokazać spotkania w promieniu 100 km od Ciebie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!showManualInput && !permissionDenied && (
            <>
              <Button
                onClick={handleGpsRequest}
                disabled={gpsLoading}
                className="w-full flex items-center gap-2"
                size="lg"
              >
                <Navigation className="h-5 w-5" />
                {gpsLoading ? 'Pobieranie lokalizacji...' : 'Użyj mojej lokalizacji GPS'}
              </Button>

              {gpsError && (
                <p className="text-sm text-destructive text-center">{gpsError}</p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">lub</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setShowManualInput(true)}
                className="w-full"
              >
                Wprowadź miasto ręcznie
              </Button>
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

              {!permissionDenied && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(false)}
                  className="w-full text-muted-foreground"
                >
                  ← Wróć do opcji GPS
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}