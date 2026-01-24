import { Menu, Bell } from 'lucide-react';
import { BaBaGuLogo } from '@/components/BaBaGuLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-card border-b border-border safe-area-top z-50">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="w-6 h-6" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {profile?.points ?? 0} pkt.
          </span>
        </div>

        <BaBaGuLogo size="sm" />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="w-6 h-6" />
          </Button>
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {profile?.full_name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>
            {profile?.is_verified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-accent-foreground" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M10.28 2.28L4.5 8.06L1.72 5.28L.28 6.72L4.5 10.94L11.72 3.72L10.28 2.28Z" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
