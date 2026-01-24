import { Bell, Check, CheckCheck, Trash2, Users, UserPlus, UserMinus, Edit, XCircle, Crown, CheckCircle, Ban } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const notificationIcons: Record<string, React.ReactNode> = {
  'join_request': <UserPlus className="h-4 w-4 text-primary" />,
  'participant_accepted': <Users className="h-4 w-4 text-green-600" />,
  'participant_left': <UserMinus className="h-4 w-4 text-orange-500" />,
  'meeting_updated': <Edit className="h-4 w-4 text-blue-500" />,
  'meeting_cancelled': <XCircle className="h-4 w-4 text-destructive" />,
  'organizer_changed': <Crown className="h-4 w-4 text-amber-500" />,
  'became_organizer': <Crown className="h-4 w-4 text-amber-500" />,
  'application_accepted': <CheckCircle className="h-4 w-4 text-green-600" />,
  'application_rejected': <Ban className="h-4 w-4 text-destructive" />,
  'removed_from_meeting': <UserMinus className="h-4 w-4 text-destructive" />,
};

function NotificationItem({ 
  notification, 
  onRead, 
  onDelete,
  onClick 
}: { 
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const icon = notificationIcons[notification.type] || <Bell className="h-4 w-4" />;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.is_read && 'font-semibold')}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { 
            addSuffix: true, 
            locale: pl 
          })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onRead();
            }}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.meeting_id) {
      navigate(`/meeting/${notification.meeting_id}`);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] font-bold bg-destructive text-destructive-foreground"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-semibold">Powiadomienia</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Oznacz wszystkie
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Brak powiadomień</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
                onClick={() => handleNotificationClick(notification)}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
