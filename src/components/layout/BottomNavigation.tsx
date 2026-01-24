import { Users, PlusCircle, Calendar, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: <Users className="w-6 h-6" />, label: 'Spotkania', path: '/meetings' },
  { icon: <PlusCircle className="w-6 h-6" />, label: 'Utwórz spotkanie', path: '/create' },
  { icon: <Calendar className="w-6 h-6" />, label: 'Moje wydarzenia', path: '/my-events' },
  { icon: <MessageCircle className="w-6 h-6" />, label: 'Wiadomości', path: '/messages' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border bottom-nav safe-area-bottom z-50">
      <div className="max-w-md mx-auto flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 min-w-[70px] transition-colors',
                isActive ? 'text-secondary' : 'text-muted-foreground'
              )}
            >
              {item.icon}
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
