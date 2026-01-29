import { useState } from 'react';
import { Phone, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface PhoneVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

type Step = 'phone' | 'code' | 'success';

export function PhoneVerificationModal({
  open,
  onOpenChange,
  onVerified,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendCode = async () => {
    if (phoneNumber.replace(/\s+/g, '').length < 9) {
      toast({
        title: 'Błąd',
        description: 'Podaj prawidłowy numer telefonu (9 cyfr)',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-code', {
        body: { phoneNumber },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Kod wysłany!',
        description: 'Sprawdź SMS i wpisz otrzymany kod',
      });
      setStep('code');
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nie udało się wysłać kodu SMS',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: 'Błąd',
        description: 'Kod musi mieć 6 cyfr',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-sms-code', {
        body: { code },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStep('success');
      setTimeout(() => {
        onVerified();
        onOpenChange(false);
        // Reset state
        setStep('phone');
        setPhoneNumber('');
        setCode('');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Błąd',
        description: error.message || 'Nieprawidłowy kod',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    await handleSendCode();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Weryfikacja numeru telefonu
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' && 'Aby utworzyć lub dołączyć do spotkania, musisz zweryfikować swój numer telefonu.'}
            {step === 'code' && 'Wpisz 6-cyfrowy kod, który otrzymałeś/aś w SMS.'}
            {step === 'success' && 'Twój numer telefonu został zweryfikowany!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === 'phone' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Numer telefonu</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">+48</span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="600 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9\s]/g, ''))}
                    maxLength={11}
                    className="flex-1"
                  />
                </div>
              </div>
              <Button
                onClick={handleSendCode}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  'Wyślij kod SMS'
                )}
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <div className="space-y-2">
                <Label>Kod weryfikacyjny</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={setCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Wysłano na +48 {phoneNumber}
                </p>
              </div>
              <Button
                onClick={handleVerifyCode}
                disabled={isLoading || code.length !== 6}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Weryfikacja...
                  </>
                ) : (
                  'Zweryfikuj'
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={handleResendCode}
                disabled={isLoading}
                className="w-full text-muted-foreground"
              >
                Wyślij kod ponownie
              </Button>
            </>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="h-16 w-16 text-primary" />
              <p className="text-center font-medium">
                Numer zweryfikowany pomyślnie!
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
