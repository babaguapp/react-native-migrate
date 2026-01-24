import { useState, ReactNode } from 'react';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { SideMenu } from './SideMenu';

interface MobileLayoutProps {
  children: ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="mobile-container min-h-screen flex flex-col">
      <Header onMenuClick={() => setIsMenuOpen(true)} />
      <SideMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      
      <main className="flex-1 pt-16 pb-20 overflow-auto">
        {children}
      </main>
      
      <BottomNavigation />
    </div>
  );
}
