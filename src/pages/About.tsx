import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  Users,
  MapPin,
  Shield,
  Mail,
  Globe,
  Smartphone,
} from "lucide-react";
import { BaBaGuLogo } from "@/components/BaBaGuLogo";

export default function About() {
  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Znajdź towarzystwo",
      description: "Dołącz do spotkań lub organizuj własne wydarzenia",
    },
    {
      icon: <MapPin className="h-5 w-5" />,
      title: "W Twojej okolicy",
      description: "Odkrywaj spotkania w promieniu 100 km od Ciebie",
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Bezpieczeństwo",
      description: "Weryfikacja użytkowników i moderacja treści",
    },
    {
      icon: <Heart className="h-5 w-5" />,
      title: "Społeczność",
      description: "Buduj nowe znajomości i dziel się pasjami",
    },
  ];

  return (
    <MobileLayout title="O aplikacji" showBack>
      <div className="flex flex-col pb-8">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="mb-4">
            <BaBaGuLogo size="lg" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">BaBaGu</h1>
          <Badge variant="secondary" className="mb-4">
            Wersja 1.0.0
          </Badge>
          <p className="text-center text-muted-foreground max-w-sm">
            Aplikacja do organizowania spotkań i znajdowania towarzystwa do
            wspólnych aktywności.
          </p>
        </div>

        <Separator className="mx-4" />

        {/* Features */}
        <div className="px-4 py-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Co oferujemy?
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {features.map((feature, index) => (
              <Card key={index} className="bg-card border-border">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="mx-4" />

        {/* Contact Section */}
        <div className="px-4 py-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Kontakt
          </h2>
          <Card className="bg-card border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <a
                  href="mailto:kontakt@babaugu.pl"
                  className="text-primary hover:underline"
                >
                  kontakt@babaugu.pl
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <a
                  href="https://babaugu.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  www.babaugu.pl
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="mx-4" />

        {/* Legal Section */}
        <div className="px-4 py-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Informacje prawne
          </h2>
          <div className="space-y-2">
            <button className="w-full text-left py-3 px-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <span className="text-foreground">Regulamin</span>
            </button>
            <button className="w-full text-left py-3 px-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <span className="text-foreground">Polityka prywatności</span>
            </button>
            <button className="w-full text-left py-3 px-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors">
              <span className="text-foreground">Licencje open source</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pt-4 pb-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Smartphone className="h-4 w-4" />
              <span className="text-sm">Stworzone z</span>
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              <span className="text-sm">w Polsce</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 Websko sp. z o.o.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Wszelkie prawa zastrzeżone
            </p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
