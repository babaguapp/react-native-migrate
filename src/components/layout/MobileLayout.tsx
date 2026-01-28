import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { SideMenu } from './SideMenu';
import { Button } from '@/components/ui/button';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showBack?: boolean;
}

export function MobileLayout({ children, title, showBack }: MobileLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="mobile-container min-h-screen flex flex-col">
      {showBack ? (
        <header className="fixed top-0 left-0 right-0 bg-card border-b border-border safe-area-top z-50">
          <div className="max-w-md mx-auto flex items-center px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-6 h-6" />
            </Button>
            {title && (
              <h1 className="ml-2 text-lg font-semibold truncate">{title}</h1>
            )}
          </div>
        </header>
      ) : (
        <Header onMenuClick={() => setIsMenuOpen(true)} />
      )}
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className={`flex-1 pb-20 overflow-auto ${showBack ? 'header-offset-small' : 'header-offset'}`}>
        {children}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
