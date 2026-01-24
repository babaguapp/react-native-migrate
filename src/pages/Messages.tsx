import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

interface ChatPreview {
  meetingId: string;
  activityName: string;
  imageUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount?: number;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchChats = async () => {
      try {
        // Get meetings where user is creator
        const { data: createdMeetings, error: createdError } = await supabase
          .from('meetings')
          .select(`
            id,
            image_url,
            activities!inner(name)
          `)
          .eq('creator_id', user.id);

        if (createdError) throw createdError;

        // Get meetings where user is confirmed participant
        const { data: participatingMeetings, error: participatingError } = await supabase
          .from('meeting_participants')
          .select(`
            meeting_id,
            meetings!inner(
              id,
              image_url,
              activities!inner(name)
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (participatingError) throw participatingError;

        // Combine all meeting IDs
        const allMeetings: { id: string; image_url: string | null; activityName: string }[] = [];
        
        createdMeetings?.forEach((m) => {
          allMeetings.push({
            id: m.id,
            image_url: m.image_url,
            activityName: (m.activities as any).name,
          });
        });

        participatingMeetings?.forEach((p) => {
          const meeting = p.meetings as any;
          // Avoid duplicates (if creator is also participant)
          if (!allMeetings.find(m => m.id === meeting.id)) {
            allMeetings.push({
              id: meeting.id,
              image_url: meeting.image_url,
              activityName: meeting.activities.name,
            });
          }
        });

        // Get last message for each meeting
        const chatPreviews: ChatPreview[] = await Promise.all(
          allMeetings.map(async (meeting) => {
            const { data: lastMessageData } = await supabase
              .from('chat_messages')
              .select('content, created_at')
              .eq('meeting_id', meeting.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              meetingId: meeting.id,
              activityName: meeting.activityName,
              imageUrl: meeting.image_url,
              lastMessage: lastMessageData?.content || null,
              lastMessageAt: lastMessageData?.created_at || null,
            };
          })
        );

        // Sort by last message date (most recent first), chats without messages at the end
        chatPreviews.sort((a, b) => {
          if (!a.lastMessageAt && !b.lastMessageAt) return 0;
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });

        setChats(chatPreviews);
      } catch (error) {
        console.error('Error fetching chats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChats();
  }, [user]);

  const truncateMessage = (message: string | null, maxLength: number = 40) => {
    if (!message) return 'Brak wiadomości';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: pl });
  };

  const handleChatClick = (meetingId: string) => {
    navigate(`/meeting/${meetingId}?tab=chat`);
  };

  return (
    <MobileLayout>
      <div className="px-4 py-4">
        <h1 className="text-2xl font-bold text-foreground mb-4">Wiadomości</h1>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              Brak czatów
            </p>
            <p className="text-muted-foreground text-sm">
              Dołącz do spotkania, aby uzyskać dostęp do czatu
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <button
                key={chat.meetingId}
                onClick={() => handleChatClick(chat.meetingId)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
              >
                {/* Avatar - meeting image */}
                <Avatar className="h-14 w-14 flex-shrink-0">
                  <AvatarImage src={chat.imageUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {chat.activityName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* Chat info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {chat.activityName}
                    </h3>
                    {chat.lastMessageAt && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatTime(chat.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {truncateMessage(chat.lastMessage)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
