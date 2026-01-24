import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

interface UnreadCount {
  meetingId: string;
  count: number;
}

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCount[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUnreadCounts = useCallback(async () => {
    if (!user) {
      setUnreadCounts([]);
      setTotalUnread(0);
      setIsLoading(false);
      return;
    }

    try {
      // Get all meetings user is part of (creator or accepted participant)
      const { data: createdMeetings } = await supabase
        .from('meetings')
        .select('id')
        .eq('creator_id', user.id);

      const { data: participatingMeetings } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      const meetingIds = new Set<string>();
      createdMeetings?.forEach(m => meetingIds.add(m.id));
      participatingMeetings?.forEach(p => meetingIds.add(p.meeting_id));

      if (meetingIds.size === 0) {
        setUnreadCounts([]);
        setTotalUnread(0);
        setIsLoading(false);
        return;
      }

      // Get read status for all meetings
      const { data: readStatuses } = await supabase
        .from('chat_read_status')
        .select('meeting_id, last_read_at')
        .eq('user_id', user.id)
        .in('meeting_id', Array.from(meetingIds));

      const readStatusMap = new Map<string, string>();
      readStatuses?.forEach(rs => {
        readStatusMap.set(rs.meeting_id, rs.last_read_at);
      });

      // Count unread messages for each meeting
      const counts: UnreadCount[] = await Promise.all(
        Array.from(meetingIds).map(async (meetingId) => {
          const lastReadAt = readStatusMap.get(meetingId);
          
          let query = supabase
            .from('chat_messages')
            .select('id', { count: 'exact', head: true })
            .eq('meeting_id', meetingId)
            .neq('user_id', user.id); // Don't count own messages

          if (lastReadAt) {
            query = query.gt('created_at', lastReadAt);
          }

          const { count } = await query;

          return {
            meetingId,
            count: count || 0,
          };
        })
      );

      setUnreadCounts(counts);
      setTotalUnread(counts.reduce((sum, c) => sum + c.count, 0));
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (meetingId: string) => {
    if (!user) return;

    try {
      const { data: existing } = await supabase
        .from('chat_read_status')
        .select('id')
        .eq('user_id', user.id)
        .eq('meeting_id', meetingId)
        .single();

      if (existing) {
        await supabase
          .from('chat_read_status')
          .update({ last_read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('meeting_id', meetingId);
      } else {
        await supabase
          .from('chat_read_status')
          .insert({
            user_id: user.id,
            meeting_id: meetingId,
            last_read_at: new Date().toISOString(),
          });
      }

      // Update local state
      setUnreadCounts(prev => 
        prev.map(c => c.meetingId === meetingId ? { ...c, count: 0 } : c)
      );
      setTotalUnread(prev => {
        const meetingCount = unreadCounts.find(c => c.meetingId === meetingId)?.count || 0;
        return Math.max(0, prev - meetingCount);
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, [user, unreadCounts]);

  const getUnreadCount = useCallback((meetingId: string) => {
    return unreadCounts.find(c => c.meetingId === meetingId)?.count || 0;
  }, [unreadCounts]);

  useEffect(() => {
    fetchUnreadCounts();
  }, [fetchUnreadCounts]);

  // Subscribe to new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMessage = payload.new as { meeting_id: string; user_id: string };
          
          // Only increment if not our own message
          if (newMessage.user_id !== user.id) {
            setUnreadCounts(prev => {
              const existing = prev.find(c => c.meetingId === newMessage.meeting_id);
              if (existing) {
                return prev.map(c => 
                  c.meetingId === newMessage.meeting_id 
                    ? { ...c, count: c.count + 1 } 
                    : c
                );
              }
              return [...prev, { meetingId: newMessage.meeting_id, count: 1 }];
            });
            setTotalUnread(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    unreadCounts,
    totalUnread,
    isLoading,
    getUnreadCount,
    markAsRead,
    refetch: fetchUnreadCounts,
  };
}
