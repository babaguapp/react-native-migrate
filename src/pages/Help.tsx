import { useState } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { MessageCircle, Mail, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Imię jest wymagane').max(100, 'Imię jest za długie'),
  email: z.string().trim().email('Nieprawidłowy adres email').max(255, 'Email jest za długi'),
  subject: z.string().trim().min(1, 'Temat jest wymagany').max(200, 'Temat jest za długi'),
  message: z.string().trim().min(10, 'Wiadomość musi mieć minimum 10 znaków').max(2000, 'Wiadomość jest za długa'),
});

const faqItems = [
  {
    question: 'Jak mogę utworzyć nowe spotkanie?',
    answer: 'Aby utworzyć spotkanie, kliknij przycisk "+" na dolnym pasku nawigacji. Wypełnij formularz podając kategorię aktywności, datę, miejsce i liczbę uczestników.',
  },
  {
    question: 'Jak dołączyć do istniejącego spotkania?',
    answer: 'Przeglądaj dostępne spotkania na stronie głównej lub użyj wyszukiwarki. Kliknij na interesujące Cię spotkanie i wybierz "Dołącz". Organizator otrzyma powiadomienie i może zaakceptować Twoją prośbę.',
  },
  {
    question: 'Czy mogę anulować udział w spotkaniu?',
    answer: 'Tak, możesz zrezygnować z udziału w spotkaniu w każdej chwili. Wejdź w szczegóły spotkania i wybierz opcję "Opuść spotkanie". Pamiętaj, że częste anulowanie może wpłynąć na Twoją reputację.',
  },
  {
    question: 'Jak działa weryfikacja profilu?',
    answer: 'Weryfikacja profilu zwiększa Twoją wiarygodność. Możesz zweryfikować swój profil poprzez potwierdzenie numeru telefonu lub połączenie z kontem społecznościowym. Zweryfikowani użytkownicy mają specjalną odznakę.',
  },
  {
    question: 'Co to jest subskrypcja Premium?',
    answer: 'Premium daje dostęp do dodatkowych funkcji: nieograniczona liczba spotkań, priorytetowe wyświetlanie, zaawansowane filtry wyszukiwania i brak reklam. Możesz aktywować Premium w ustawieniach.',
  },
  {
    question: 'Jak zgłosić nieodpowiednie zachowanie?',
    answer: 'Bezpieczeństwo naszej społeczności jest priorytetem. Możesz zgłosić użytkownika lub spotkanie klikając ikonę trzech kropek i wybierając "Zgłoś". Nasz zespół przeanalizuje zgłoszenie w ciągu 24 godzin.',
  },
  {
    question: 'Jak zmienić lokalizację wyszukiwania?',
    answer: 'Aplikacja automatycznie wykrywa Twoją lokalizację. Możesz też ręcznie wyszukać spotkania w konkretnym mieście używając wyszukiwarki i filtrów lokalizacji.',
  },
  {
    question: 'Czy moje dane są bezpieczne?',
    answer: 'Tak, stosujemy najwyższe standardy bezpieczeństwa. Twoje dane są szyfrowane, a dostęp do szczegółowych informacji mają tylko zaakceptowani uczestnicy spotkań. Więcej w Polityce Prywatności.',
  },
];

export default function Help() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    // TODO: Implement email sending when SMTP is configured
    // For now, just show success message
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: 'Wiadomość wysłana',
      description: 'Dziękujemy za kontakt! Odpowiemy najszybciej jak to możliwe.',
    });

    setFormData({ name: '', email: '', subject: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col min-h-full bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border">
          <div className="flex items-center gap-3 p-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">Pomoc i wsparcie</h1>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-6 pb-24">
          {/* FAQ Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-primary" />
                Najczęściej zadawane pytania
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Contact Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="w-5 h-5 text-primary" />
                Formularz kontaktowy
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Nie znalazłeś odpowiedzi? Napisz do nas na wsparcie@babagu.pl
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Imię</Label>
                  <Input
                    id="name"
                    placeholder="Twoje imię"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="twoj@email.pl"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Temat</Label>
                  <Input
                    id="subject"
                    placeholder="Temat wiadomości"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className={errors.subject ? 'border-destructive' : ''}
                  />
                  {errors.subject && (
                    <p className="text-xs text-destructive">{errors.subject}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Wiadomość</Label>
                  <Textarea
                    id="message"
                    placeholder="Opisz swój problem lub pytanie..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    className={errors.message ? 'border-destructive' : ''}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive">{errors.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}
