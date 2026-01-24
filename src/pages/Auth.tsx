import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BaBaGuLogo } from '@/components/BaBaGuLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  full_name: z.string().min(2, 'Imię i nazwisko jest wymagane'),
  username: z.string().min(3, 'Nazwa użytkownika musi mieć min. 3 znaki').regex(/^[a-z0-9_]+$/, 'Tylko małe litery, cyfry i podkreślnik'),
  email: z.string().email('Nieprawidłowy adres e-mail'),
  password: z.string().min(6, 'Hasło musi mieć min. 6 znaków'),
  gender: z.enum(['male', 'female'], { required_error: 'Wybierz płeć' }),
  birth_date: z.date({ required_error: 'Wybierz datę urodzenia' }),
});

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres e-mail'),
  password: z.string().min(1, 'Hasło jest wymagane'),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onRegister = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, {
      full_name: data.full_name,
      username: data.username,
      email: data.email,
      gender: data.gender,
      birth_date: format(data.birth_date, 'yyyy-MM-dd'),
      avatar_url: null,
      bio: null,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Błąd rejestracji',
        description: error.message === 'User already registered' 
          ? 'Użytkownik o tym adresie e-mail już istnieje'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Konto utworzone!',
      description: 'Witamy w BaBaGu!',
    });
    navigate('/meetings');
  };

  const onLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Błąd logowania',
        description: error.message === 'Invalid login credentials'
          ? 'Nieprawidłowy e-mail lub hasło'
          : error.message,
        variant: 'destructive',
      });
      return;
    }

    navigate('/meetings');
  };

  return (
    <div className="mobile-container min-h-screen bg-babagu-light-blue flex flex-col items-center justify-center p-4">
      <BaBaGuLogo size="lg" className="mb-4" />

      {isLogin ? (
        <>
          <h1 className="text-xl font-semibold text-foreground mb-8">
            Zaloguj się do swojego konta
          </h1>

          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...loginForm.register('email')}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Hasło</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    {...loginForm.register('password')}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Logowanie...' : 'Zaloguj'}
                </Button>

                <div className="text-center space-y-2">
                  <button type="button" className="text-accent hover:underline text-sm">
                    Zapomniałem hasła
                  </button>
                  <p className="text-sm text-muted-foreground">
                    Nie masz konta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className="text-accent hover:underline"
                    >
                      Zarejestruj się
                    </button>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-foreground mb-2">Rejestracja</h1>
          <p className="text-muted-foreground text-center mb-6 px-4">
            Cieszymy się, że do nas dołączasz! Wkrótce poznasz wiele nowych, wspaniałych osób - takich jak Ty!
          </p>

          <Card className="w-full max-w-sm">
            <CardContent className="pt-6">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Imię i nazwisko</Label>
                  <Input
                    id="full_name"
                    placeholder="Jan Kowalski"
                    {...registerForm.register('full_name')}
                  />
                  {registerForm.formState.errors.full_name && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nazwa użytkownika</Label>
                  <Input
                    id="username"
                    placeholder="jan_kowalski"
                    {...registerForm.register('username')}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg_email">Adres e-mail</Label>
                  <Input
                    id="reg_email"
                    type="email"
                    placeholder="jan@example.com"
                    {...registerForm.register('email')}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg_password">Hasło</Label>
                  <Input
                    id="reg_password"
                    type="password"
                    placeholder="********"
                    {...registerForm.register('password')}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Płeć</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={registerForm.watch('gender') === 'male' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        registerForm.watch('gender') === 'male' && 'bg-secondary hover:bg-secondary/90'
                      )}
                      onClick={() => registerForm.setValue('gender', 'male', { shouldValidate: true })}
                    >
                      Mężczyzna
                    </Button>
                    <Button
                      type="button"
                      variant={registerForm.watch('gender') === 'female' ? 'default' : 'outline'}
                      className={cn(
                        'flex-1',
                        registerForm.watch('gender') === 'female' && 'bg-secondary hover:bg-secondary/90'
                      )}
                      onClick={() => registerForm.setValue('gender', 'female', { shouldValidate: true })}
                    >
                      Kobieta
                    </Button>
                  </div>
                  {registerForm.formState.errors.gender && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.gender.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Data urodzenia</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !registerForm.watch('birth_date') && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {registerForm.watch('birth_date') ? (
                          format(registerForm.watch('birth_date'), 'PPP', { locale: pl })
                        ) : (
                          'Wybierz datę urodzenia'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={registerForm.watch('birth_date')}
                        onSelect={(date) => registerForm.setValue('birth_date', date as Date, { shouldValidate: true })}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                        captionLayout="dropdown-buttons"
                        fromYear={1940}
                        toYear={new Date().getFullYear() - 13}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {registerForm.formState.errors.birth_date && (
                    <p className="text-sm text-destructive">{registerForm.formState.errors.birth_date.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Rejestracja...' : 'Zarejestruj się'}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Rejestrując się akceptujesz{' '}
                  <a href="#" className="text-accent hover:underline">Regulamin</a>
                </p>

                <p className="text-sm text-muted-foreground text-center">
                  Masz już konto?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-accent hover:underline"
                  >
                    Zaloguj się
                  </button>
                </p>
              </form>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
