import { X, Crown, Bell, Settings, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: <Crown className="w-5 h-5" />, label: 'Subskrypcja Premium', path: '/premium' },
  { icon: <Bell className="w-5 h-5" />, label: 'Powiadomienia', path: '/notifications' },
];

const settingsItems = [
  { icon: <Settings className="w-5 h-5" />, label: 'Ustawienia', path: '/settings' },
  { icon: <HelpCircle className="w-5 h-5" />, label: 'Pomoc i wsparcie', path: '/help' },
  { icon: <Info className="w-5 h-5" />, label: 'O aplikacji', path: '/about' },
];

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-50 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-80 bg-card z-50 transform transition-transform duration-300 safe-area-top',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
            <h2 className="text-lg font-semibold">Menu</h2>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>

          {/* Menu items */}
          <div className="flex-1 py-4">
            <div className="px-4 space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  className="flex items-center gap-4 w-full px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {item.icon}
                  <span className="text-base">{item.label}</span>
                </button>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="px-4 space-y-1">
              {settingsItems.map((item) => (
                <button
                  key={item.path}
                  className="flex items-center gap-4 w-full px-4 py-3 text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  {item.icon}
                  <span className="text-base">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <p className="text-sm text-muted-foreground text-center">
              Websko sp. z o.o.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
