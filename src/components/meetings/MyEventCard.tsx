import { Users, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MyEventCardProps {
  meeting: {
    id: string;
    activity_name: string;
    category_name: string;
    creator_username: string;
    current_participants: number;
    max_participants: number;
    meeting_date: string;
    city: string;
    image_url?: string | null;
  };
  badge: string;
  badgeVariant: 'organizer' | 'participant';
  isPast?: boolean;
  onClick?: () => void;
}

export function MyEventCard({ meeting, badge, badgeVariant, isPast = false, onClick }: MyEventCardProps) {
  const formattedDate = format(new Date(meeting.meeting_date), 'd/M/yyyy', { locale: pl });

  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer hover:shadow-lg transition-shadow relative",
        isPast && "opacity-75"
      )}
      onClick={onClick}
    >
      {/* Badge ribbon */}
      <div className="absolute top-3 left-0 z-10">
        <Badge 
          className={cn(
            "rounded-l-none rounded-r-full px-3 py-1 text-xs font-semibold shadow-md",
            badgeVariant === 'organizer' 
              ? "bg-primary text-primary-foreground" 
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {badge}
        </Badge>
      </div>

      {meeting.image_url && (
        <div className="aspect-video relative overflow-hidden">
          <img
            src={meeting.image_url}
            alt={meeting.activity_name}
            className={cn("w-full h-full object-cover", isPast && "grayscale")}
          />
        </div>
      )}
      
      <CardContent className="p-4 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">
              {meeting.activity_name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {meeting.category_name}
            </p>
          </div>
          <span className="text-sm text-primary font-medium whitespace-nowrap">
            @{meeting.creator_username}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{meeting.current_participants}/{meeting.max_participants}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span>{meeting.city}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
