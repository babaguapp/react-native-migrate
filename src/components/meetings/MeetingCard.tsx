import { Users, Calendar, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { getActivityImage } from '@/lib/activityImages';

interface MeetingCardProps {
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
  onClick?: () => void;
}

export function MeetingCard({ meeting, onClick }: MeetingCardProps) {
  const formattedDate = format(new Date(meeting.meeting_date), 'd/M/yyyy', { locale: pl });
  
  // Use activity image from assets, fallback to meeting.image_url
  const activityImage = getActivityImage(meeting.activity_name);
  const displayImage = activityImage || meeting.image_url;

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {displayImage && (
        <div className="aspect-video relative overflow-hidden">
          <img
            src={displayImage}
            alt={meeting.activity_name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4">
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
