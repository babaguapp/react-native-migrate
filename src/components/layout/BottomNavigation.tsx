import { Users, PlusCircle, Calendar, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  showBadge?: boolean;
}

const navItems: NavItem[] = [
  { icon: <Users className="w-6 h-6" />, label: 'Spotkania', path: '/meetings' },
  { icon: <PlusCircle className="w-6 h-6" />, label: 'Utwórz', path: '/create' },
  { icon: <Calendar className="w-6 h-6" />, label: 'Moje wydarzenia', path: '/my-events' },
  { icon: <MessageCircle className="w-6 h-6" />, label: 'Wiadomości', path: '/messages', showBadge: true },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalUnread } = useUnreadMessages();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border bottom-nav safe-area-bottom z-50">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const showBadge = item.showBadge && totalUnread > 0;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[70px] transition-colors relative',
                isActive ? 'text-secondary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                {item.icon}
                {showBadge && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] font-bold bg-destructive text-destructive-foreground"
                  >
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
