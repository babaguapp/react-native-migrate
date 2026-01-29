import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BaBaGuLogo } from '@/components/BaBaGuLogo';
import { supabase } from '@/lib/supabaseClient';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Brak tokenu weryfikacyjnego');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-email', {
        body: { token: verificationToken },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error.includes('wygasł')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        setErrorMessage(data.error);
        return;
      }

      setStatus('success');
    } catch (error: any) {
      console.error('Verification error:', error);
      setStatus('error');
      setErrorMessage(error.message || 'Wystąpił błąd podczas weryfikacji');
    }
  };

  const handleContinue = () => {
    navigate('/meetings');
  };

  const handleResendEmail = async () => {
    setStatus('loading');
    try {
      const { data, error } = await supabase.functions.invoke('send-verification-email', {});
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus('error');
      setErrorMessage('Wysłano nowy email weryfikacyjny. Sprawdź swoją skrzynkę.');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage('Nie udało się wysłać emaila. Zaloguj się i spróbuj ponownie.');
    }
  };

  return (
    <div className="mobile-container min-h-screen bg-babagu-light-blue flex flex-col items-center justify-center p-4">
      <BaBaGuLogo size="lg" className="mb-8" />

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-center text-muted-foreground">
                Weryfikacja adresu e-mail...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-16 w-16 text-primary" />
              <h2 className="text-xl font-semibold text-center">
                Adres e-mail zweryfikowany!
              </h2>
              <p className="text-center text-muted-foreground">
                Twoje konto jest teraz w pełni aktywne. Możesz zacząć korzystać z BaBaGu!
              </p>
              <Button onClick={handleContinue} className="w-full mt-4">
                Przejdź do aplikacji
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <XCircle className="h-16 w-16 text-destructive" />
              <h2 className="text-xl font-semibold text-center">
                Błąd weryfikacji
              </h2>
              <p className="text-center text-muted-foreground">
                {errorMessage}
              </p>
              <Button onClick={handleContinue} variant="outline" className="w-full mt-4">
                Przejdź do aplikacji
              </Button>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Mail className="h-16 w-16 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-center">
                Link wygasł
              </h2>
              <p className="text-center text-muted-foreground">
                Link weryfikacyjny wygasł. Kliknij poniżej, aby otrzymać nowy email.
              </p>
              <Button onClick={handleResendEmail} className="w-full mt-4">
                Wyślij nowy email
              </Button>
              <Button onClick={handleContinue} variant="ghost" className="w-full">
                Przejdź do aplikacji
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
