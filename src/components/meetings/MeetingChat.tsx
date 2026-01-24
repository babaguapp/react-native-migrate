import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface MeetingChatProps {
  meetingId: string;
  isCreator: boolean;
  isParticipant: boolean;
}

export function MeetingChat({ meetingId, isCreator, isParticipant }: MeetingChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { markAsRead } = useUnreadMessages();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string; username: string; avatar_url: string | null }>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const canChat = isCreator || isParticipant;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const missingIds = userIds.filter(id => !profiles[id]);
    if (missingIds.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, avatar_url")
      .in("user_id", missingIds);

    if (!error && data) {
      const newProfiles: Record<string, { full_name: string; username: string; avatar_url: string | null }> = {};
      data.forEach((p) => {
        newProfiles[p.user_id] = {
          full_name: p.full_name,
          username: p.username,
          avatar_url: p.avatar_url,
        };
      });
      setProfiles(prev => ({ ...prev, ...newProfiles }));
    }
  }, [profiles]);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      
      // Fetch profiles for message authors
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      if (userIds.length > 0) {
        await fetchProfiles(userIds);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [meetingId, fetchProfiles]);

  useEffect(() => {
    if (!canChat) {
      setIsLoading(false);
      return;
    }

    fetchMessages();
    
    // Mark messages as read when entering chat
    markAsRead(meetingId);

    // Subscribe to realtime messages
    const channel = supabase
      .channel(`chat:${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `meeting_id=eq.${meetingId}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          
          // Fetch profile if we don't have it
          if (!profiles[newMsg.user_id]) {
            await fetchProfiles([newMsg.user_id]);
          }
          
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: string[] = [];
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.is_typing && presence.user_id !== user?.id) {
              typing.push(presence.username || "Ktoś");
            }
          });
        });
        
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && user) {
          await channel.track({
            user_id: user.id,
            username: user.user_metadata?.username || "Użytkownik",
            is_typing: false,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [meetingId, user, canChat, fetchMessages, fetchProfiles, profiles, markAsRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user || isTypingRef.current === isTyping) return;
    
    isTypingRef.current = isTyping;
    
    await channelRef.current.track({
      user_id: user.id,
      username: user.user_metadata?.username || "Użytkownik",
      is_typing: isTyping,
    });
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Update typing status
    updateTypingStatus(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing status
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || isSending) return;

    setIsSending(true);
    updateTypingStatus(false);

    try {
      const { error } = await supabase.from("chat_messages").insert({
        meeting_id: meetingId,
        user_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wysłać wiadomości",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!canChat) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Send className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-foreground mb-2">
          Chat dostępny dla uczestników
        </p>
        <p className="text-muted-foreground">
          Dołącz do spotkania, aby uzyskać dostęp do chatu grupowego
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Helper to check if we should show date separator
  const shouldShowDateSeparator = (currentMsg: ChatMessage, prevMsg: ChatMessage | null) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Dzisiaj";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Wczoraj";
    } else {
      return format(date, "d MMMM yyyy", { locale: pl });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 py-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Brak wiadomości</p>
            <p className="text-sm mt-1">Rozpocznij rozmowę!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.user_id === user?.id;
            const profile = profiles[message.user_id];
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
            
            return (
              <div key={message.id}>
                {/* Date Separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-4">
                    <div className="bg-muted/80 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
                      {formatDateSeparator(message.created_at)}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                  {/* Avatar - clickable for other users */}
                  <button
                    onClick={() => !isOwnMessage && navigate(`/user/${message.user_id}`)}
                    disabled={isOwnMessage}
                    className={`flex-shrink-0 mt-5 ${!isOwnMessage ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className={`text-xs font-semibold ${isOwnMessage ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  
                  <div className={`max-w-[70%] flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}>
                    {/* Sender name - clickable for other users */}
                    {isOwnMessage ? (
                      <p className="text-xs text-muted-foreground mb-1 mr-1">Ty</p>
                    ) : (
                      <button
                        onClick={() => navigate(`/user/${message.user_id}`)}
                        className="text-xs text-muted-foreground mb-1 ml-1 hover:text-primary hover:underline"
                      >
                        {profile?.full_name || "Użytkownik"}
                      </button>
                    )}
                    
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    
                    {/* Time */}
                    <p className={`text-xs text-muted-foreground mt-1 ${isOwnMessage ? "mr-1" : "ml-1"}`}>
                      {format(new Date(message.created_at), "HH:mm", { locale: pl })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm ml-10">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} pisze...`
                : `${typingUsers.length} osób pisze...`}
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="flex gap-2 pt-3 border-t">
        <Input
          value={newMessage}
          onChange={handleInputChange}
          placeholder="Napisz wiadomość..."
          className="flex-1 rounded-full"
          disabled={isSending}
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-full h-10 w-10"
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
