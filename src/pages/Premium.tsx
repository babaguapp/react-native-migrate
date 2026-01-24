import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  Crown, 
  Check, 
  Zap, 
  Users, 
  MessageSquare, 
  Eye, 
  Shield, 
  Star,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const benefits = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Nieograniczona liczba spotkań',
    description: 'Twórz i dołączaj do nieograniczonej liczby spotkań miesięcznie',
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: 'Priorytetowe wyświetlanie',
    description: 'Twoje spotkania będą wyświetlane wyżej w wynikach wyszukiwania',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Więcej uczestników',
    description: 'Zapraszaj do 20 osób na jedno spotkanie (zamiast 10)',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Zaawansowany chat',
    description: 'Wysyłaj zdjęcia i pliki w rozmowach grupowych',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Weryfikacja profilu',
    description: 'Specjalna odznaka Premium zwiększająca zaufanie',
  },
  {
    icon: <Star className="w-5 h-5" />,
    title: 'Brak reklam',
    description: 'Korzystaj z aplikacji bez żadnych reklam',
  },
];

const plans = [
  {
    id: 'monthly',
    name: 'Miesięczny',
    price: '19,99 zł',
    period: '/miesiąc',
    description: 'Elastyczny plan bez zobowiązań',
    popular: false,
  },
  {
    id: 'quarterly',
    name: 'Kwartalny',
    price: '14,99 zł',
    period: '/miesiąc',
    totalPrice: '44,97 zł / 3 miesiące',
    description: 'Oszczędzasz 25%',
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Roczny',
    price: '9,99 zł',
    period: '/miesiąc',
    totalPrice: '119,88 zł / rok',
    description: 'Oszczędzasz 50%',
    popular: false,
  },
];

export default function Premium() {
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    // TODO: Implement Stripe payment when ready
    console.log('Selected plan:', planId);
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
            <h1 className="text-xl font-bold">Premium</h1>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-6 pb-24">
          {/* Hero Section */}
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">BaBaGu Premium</h2>
            <p className="text-muted-foreground">
              Odblokuj pełny potencjał aplikacji i ciesz się wszystkimi funkcjami
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Co zyskujesz?
            </h3>
            <div className="grid gap-3">
              {benefits.map((benefit, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      {benefit.icon}
                    </div>
                    <div>
                      <h4 className="font-medium">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {benefit.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Pricing Plans */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Wybierz plan</h3>
            <div className="space-y-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    'relative overflow-hidden transition-all cursor-pointer hover:border-primary/50',
                    plan.popular && 'border-primary ring-1 ring-primary'
                  )}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {plan.popular && (
                    <Badge className="absolute top-3 right-3 bg-primary">
                      Najpopularniejszy
                    </Badge>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">{plan.period}</span>
                    </div>
                    {plan.totalPrice && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {plan.totalPrice}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <Button className="w-full h-12 text-base" size="lg">
            <Crown className="w-5 h-5 mr-2" />
            Rozpocznij 7-dniowy okres próbny
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Po zakończeniu okresu próbnego zostaniesz automatycznie przeniesiony na wybrany plan.
            Możesz anulować w dowolnym momencie.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
