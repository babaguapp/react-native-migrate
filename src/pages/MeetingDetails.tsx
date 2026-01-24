import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar,
  Users,
  Share2,
  UserPlus,
  Crown,
  LogOut,
  X,
  UserMinus,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MeetingChat } from "@/components/meetings/MeetingChat";
import {
  notifyJoinRequest,
  notifyParticipantLeft,
  notifyMeetingCancelled,
  notifyMeetingUpdated,
  notifyBecameOrganizer,
  notifyOrganizerChanged,
  notifyRemovedFromMeeting,
} from "@/lib/notifications";

interface Participant {
  user_id: string;
  status: string;
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
}

interface MeetingDetails {
  id: string;
  creator_id: string;
  activity_id: string;
  meeting_date: string;
  max_participants: number;
  description: string | null;
  gender_preference: string;
  city: string;
  image_url: string | null;
  activity: {
    name: string;
    category: {
      name: string;
      icon: string | null;
    };
  };
  creator: {
    full_name: string;
    username: string;
    avatar_url: string | null;
  };
  participants: Participant[];
}

const MeetingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<MeetingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isCreator = user?.id === meeting?.creator_id;
  const confirmedParticipants =
    meeting?.participants.filter((p) => p.status === "accepted").length || 0;
  const pendingParticipants =
    meeting?.participants.filter((p) => p.status === "pending").length || 0;

  useEffect(() => {
    fetchMeetingDetails();
  }, [id]);

  const fetchMeetingDetails = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("meetings")
        .select(
          `
          *,
          activity:activities(
            name,
            category:categories(name, icon)
          ),
          creator:profiles!meetings_creator_id_fkey(
            full_name,
            username,
            avatar_url
          ),
          participants:meeting_participants(
            user_id,
            status,
            profile:profiles!meeting_participants_user_id_fkey(
              full_name,
              username,
              avatar_url
            )
          )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Błąd",
          description: "Nie znaleziono spotkania",
          variant: "destructive",
        });
        navigate("/meetings");
        return;
      }

      setMeeting(data as unknown as MeetingDetails);
      setEditedDescription(data.description || "");
    } catch (error) {
      console.error("Error fetching meeting:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać szczegółów spotkania",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: meeting?.activity.name,
          text: `Dołącz do spotkania: ${meeting?.activity.name}`,
          url,
        });
      } catch (error) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Skopiowano",
        description: "Link do spotkania został skopiowany",
      });
    }
  };

  const handleSaveDescription = async () => {
    if (!meeting) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meetings")
        .update({ description: editedDescription })
        .eq("id", meeting.id);

      if (error) throw error;

      // Notify accepted participants about the update
      const acceptedParticipantIds = meeting.participants
        .filter((p) => p.status === "accepted")
        .map((p) => p.user_id);

      if (acceptedParticipantIds.length > 0) {
        await notifyMeetingUpdated(acceptedParticipantIds, meeting.id);
      }

      setMeeting({ ...meeting, description: editedDescription });
      setIsEditingDescription(false);
      toast({
        title: "Zapisano",
        description: "Opis został zaktualizowany",
      });
    } catch (error) {
      console.error("Error updating description:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać opisu",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelMeeting = async () => {
    if (!meeting || !user) return;

    try {
      const acceptedParticipants = meeting.participants.filter(
        (p) => p.status === "accepted"
      );

      // If there are accepted participants, transfer ownership
      if (acceptedParticipants.length > 0) {
        // Find the earliest joined participant (they're already ordered by joined_at in the query)
        // We need to fetch with joined_at to find the earliest
        const { data: earliestParticipant, error: fetchError } = await supabase
          .from("meeting_participants")
          .select("user_id, profile:profiles!meeting_participants_user_id_fkey(full_name)")
          .eq("meeting_id", meeting.id)
          .eq("status", "accepted")
          .order("joined_at", { ascending: true })
          .limit(1)
          .single();

        if (fetchError) throw fetchError;

        if (earliestParticipant) {
          // Update meeting creator
          const { error: updateError } = await supabase
            .from("meetings")
            .update({ creator_id: earliestParticipant.user_id })
            .eq("id", meeting.id);

          if (updateError) throw updateError;

          // Remove new organizer from participants table
          await supabase
            .from("meeting_participants")
            .delete()
            .eq("meeting_id", meeting.id)
            .eq("user_id", earliestParticipant.user_id);

          // Notify the new organizer
          await notifyBecameOrganizer(earliestParticipant.user_id, meeting.id);

          // Notify other participants about organizer change
          const otherParticipantIds = acceptedParticipants
            .filter((p) => p.user_id !== earliestParticipant.user_id)
            .map((p) => p.user_id);

          if (otherParticipantIds.length > 0) {
            const newOrganizerName = (earliestParticipant.profile as { full_name: string }).full_name;
            await notifyOrganizerChanged(
              otherParticipantIds,
              newOrganizerName,
              meeting.id,
              earliestParticipant.user_id
            );
          }

          toast({
            title: "Opuściłeś spotkanie",
            description: "Spotkanie zostało przekazane innemu uczestnikowi",
          });
          navigate("/my-events");
          return;
        }
      }

      // No accepted participants - actually cancel the meeting
      // First notify all pending participants
      const pendingParticipantIds = meeting.participants
        .filter((p) => p.status === "pending")
        .map((p) => p.user_id);

      if (pendingParticipantIds.length > 0) {
        await notifyMeetingCancelled(pendingParticipantIds, meeting.id);
      }

      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meeting.id);

      if (error) throw error;

      toast({
        title: "Anulowano",
        description: "Spotkanie zostało anulowane",
      });
      navigate("/my-events");
    } catch (error) {
      console.error("Error cancelling meeting:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się anulować spotkania",
        variant: "destructive",
      });
    }
  };

  const handleJoinMeeting = async () => {
    if (!meeting || !user) return;

    try {
      const { error } = await supabase
        .from("meeting_participants")
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          status: "pending",
        });

      if (error) throw error;

      // Notify organizer about join request
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        await notifyJoinRequest(
          meeting.creator_id,
          profile.full_name,
          meeting.id,
          user.id
        );
      }

      toast({
        title: "Zgłoszenie wysłane",
        description: "Czekaj na akceptację organizatora",
      });
      fetchMeetingDetails();
    } catch (error) {
      console.error("Error joining meeting:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się dołączyć do spotkania",
        variant: "destructive",
      });
    }
  };

  const handleLeaveMeeting = async () => {
    if (!meeting || !user) return;

    try {
      // Get my profile name for notification
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();

      const { error } = await supabase
        .from("meeting_participants")
        .delete()
        .eq("meeting_id", meeting.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // Notify organizer and other participants
      const otherParticipantIds = meeting.participants
        .filter((p) => p.status === "accepted" && p.user_id !== user.id)
        .map((p) => p.user_id);

      const allToNotify = [meeting.creator_id, ...otherParticipantIds];

      if (myProfile) {
        await notifyParticipantLeft(
          allToNotify,
          myProfile.full_name,
          meeting.id,
          user.id
        );
      }

      toast({
        title: "Opuściłeś spotkanie",
        description: "Możesz dołączyć ponownie w każdej chwili",
      });
      fetchMeetingDetails();
    } catch (error) {
      console.error("Error leaving meeting:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się opuścić spotkania",
        variant: "destructive",
      });
    }
  };

  const handleWithdrawApplication = async () => {
    if (!meeting || !user) return;

    try {
      const { error } = await supabase
        .from("meeting_participants")
        .delete()
        .eq("meeting_id", meeting.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Wycofano zgłoszenie",
        description: "Możesz zgłosić się ponownie w każdej chwili",
      });
      fetchMeetingDetails();
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wycofać zgłoszenia",
        variant: "destructive",
      });
    }
  };

  const handleRemoveParticipant = async (participantUserId: string, participantName: string) => {
    if (!meeting || !user) return;

    try {
      const { error } = await supabase
        .from("meeting_participants")
        .delete()
        .eq("meeting_id", meeting.id)
        .eq("user_id", participantUserId);

      if (error) throw error;

      // Notify the removed participant
      await notifyRemovedFromMeeting(
        participantUserId,
        meeting.id,
        meeting.activity.name
      );

      // Notify other participants
      const otherParticipantIds = meeting.participants
        .filter((p) => p.status === "accepted" && p.user_id !== participantUserId)
        .map((p) => p.user_id);

      if (otherParticipantIds.length > 0) {
        await notifyParticipantLeft(
          otherParticipantIds,
          participantName,
          meeting.id,
          participantUserId
        );
      }

      toast({
        title: "Usunięto uczestnika",
        description: `${participantName} został usunięty ze spotkania`,
      });
      fetchMeetingDetails();
    } catch (error) {
      console.error("Error removing participant:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć uczestnika",
        variant: "destructive",
      });
    }
  };

  const getGenderLabel = (preference: string) => {
    switch (preference) {
      case "female":
        return "Dla Kobiet";
      case "male":
        return "Dla Mężczyzn";
      default:
        return "Dla Wszystkich";
    }
  };

  const getGenderIcon = (preference: string) => {
    switch (preference) {
      case "female":
        return "♀";
      case "male":
        return "♂";
      default:
        return "♂♀";
    }
  };

  const hasUserApplied = meeting?.participants.some(p => p.user_id === user?.id && p.status === "pending");
  const isAcceptedParticipant = meeting?.participants.some(p => p.user_id === user?.id && p.status === "accepted");

  if (isLoading) {
    return (
      <MobileLayout title="Szczegóły spotkania" showBack>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileLayout>
    );
  }

  if (!meeting) {
    return (
      <MobileLayout title="Szczegóły spotkania" showBack>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nie znaleziono spotkania</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Szczegóły spotkania" showBack>
      <div className="flex flex-col h-full pb-20">
        <Tabs defaultValue="info" className="flex-1 flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="w-full grid grid-cols-3 bg-muted/50">
              <TabsTrigger 
                value="info" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                Informacje
              </TabsTrigger>
              <TabsTrigger 
                value="participants"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                Uczestnicy
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                Chat
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="flex-1 overflow-auto">
            <div className="px-4 pb-4">
              {/* Image */}
              <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mt-4 bg-muted shadow-lg">
                {meeting.image_url ? (
                  <img
                    src={meeting.image_url}
                    alt={meeting.activity.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20">
                    <span className="text-6xl">
                      {meeting.activity.category.icon || "📅"}
                    </span>
                  </div>
                )}
              </div>

              {/* Title Row */}
              <div className="flex justify-between items-start mt-5">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {meeting.activity.name}
                  </h1>
                  <p className="text-muted-foreground">
                    {meeting.activity.category.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-foreground">
                    {meeting.city}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Organizator:{" "}
                    <button 
                      onClick={() => navigate(`/user/${meeting.creator_id}`)}
                      className="text-primary font-medium hover:underline"
                    >
                      @{meeting.creator.username}
                    </button>
                  </p>
                </div>
              </div>

              {/* Info Bar */}
              <div className="flex items-center justify-between mt-5 py-3 px-4 bg-muted/50 rounded-full border border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {format(new Date(meeting.meeting_date), "d/M/yyyy", { locale: pl })}
                  </span>
                </div>
                <div className="w-px h-5 bg-border" />
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {confirmedParticipants + 1}/{meeting.max_participants}
                  </span>
                </div>
                <div className="w-px h-5 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{getGenderIcon(meeting.gender_preference)}</span>
                  <span className="text-sm font-medium">
                    {getGenderLabel(meeting.gender_preference)}
                  </span>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="flex items-center justify-center gap-2 w-full py-3 mt-4 text-primary hover:text-primary/80 transition-colors"
              >
                <Share2 className="h-5 w-5" />
                <span className="font-medium">Udostępnij</span>
              </button>

              {/* Description */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">Opis:</h3>
                  {isCreator && !isEditingDescription && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="text-primary font-medium hover:text-primary/80"
                      >
                        Edytuj
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-destructive font-medium hover:text-destructive/80">
                            Anuluj
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Czy na pewno chcesz anulować spotkanie?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Ta akcja jest nieodwracalna. Wszyscy uczestnicy zostaną
                              powiadomieni o anulowaniu spotkania.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Nie</AlertDialogCancel>
                            <AlertDialogAction onClick={handleCancelMeeting}>
                              Tak, anuluj
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Dodaj opis spotkania..."
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setIsEditingDescription(false);
                          setEditedDescription(meeting.description || "");
                        }}
                      >
                        Anuluj
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSaveDescription}
                        disabled={isSaving}
                      >
                        {isSaving ? "Zapisuję..." : "Zapisz"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground leading-relaxed">
                    {meeting.description || "Brak opisu"}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participants" className="flex-1 overflow-auto px-4 pb-4">
            <div className="mt-4 space-y-3">
              {/* Organizer */}
              <button
                onClick={() => navigate(`/user/${meeting.creator_id}`)}
                className="w-full flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors text-left"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={meeting.creator.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {meeting.creator.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{meeting.creator.full_name}</span>
                    <Crown className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">@{meeting.creator.username}</span>
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                  Organizator
                </span>
              </button>

              {/* Confirmed Participants */}
              {meeting.participants
                .filter((p) => p.status === "accepted")
                .map((participant) => (
                  <div
                    key={participant.user_id}
                    className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border"
                  >
                    <button
                      onClick={() => navigate(`/user/${participant.user_id}`)}
                      className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity text-left"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={participant.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                          {participant.profile.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <span className="font-semibold">{participant.profile.full_name}</span>
                        <p className="text-sm text-muted-foreground">@{participant.profile.username}</p>
                      </div>
                    </button>
                    {isCreator ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button 
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <UserMinus className="h-5 w-5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Usunąć uczestnika?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Czy na pewno chcesz usunąć {participant.profile.full_name} ze spotkania?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anuluj</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRemoveParticipant(participant.user_id, participant.profile.full_name)}
                            >
                              Usuń
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        Uczestnik
                      </span>
                    )}
                  </div>
                ))}

              {meeting.participants.filter((p) => p.status === "accepted").length === 0 && (
                <p className="text-muted-foreground text-center py-6">
                  Brak potwierdzonych uczestników
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-hidden px-4">
            <MeetingChat 
              meetingId={meeting.id}
              isCreator={isCreator}
              isParticipant={meeting.participants.some(p => p.user_id === user?.id && p.status === "accepted")}
            />
          </TabsContent>
        </Tabs>

        {/* Bottom Fixed Button */}
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <div className="max-w-md mx-auto">
            {isCreator ? (
              <Button 
                className="w-full py-6 text-base font-semibold rounded-xl shadow-lg"
                onClick={() => navigate(`/meeting/${meeting.id}/candidates`)}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Przeglądaj kandydatów ({pendingParticipants})
              </Button>
            ) : isAcceptedParticipant ? (
              <div className="space-y-3">
                <Button 
                  className="w-full py-6 text-base font-semibold rounded-xl"
                  variant="default"
                  disabled
                >
                  ✓ Jesteś uczestnikiem
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 transition-colors py-2">
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm font-medium">Opuść spotkanie</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Opuścić spotkanie?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Czy na pewno chcesz opuścić to spotkanie? Będziesz musiał ponownie wysłać zgłoszenie, aby dołączyć.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeaveMeeting}>
                        Opuść
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : hasUserApplied ? (
              <div className="space-y-3">
                <Button 
                  className="w-full py-6 text-base font-semibold rounded-xl"
                  variant="secondary"
                  disabled
                >
                  ⏳ Zgłoszenie wysłane
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center justify-center gap-2 text-destructive hover:text-destructive/80 transition-colors py-2">
                      <X className="h-4 w-4" />
                      <span className="text-sm font-medium">Wycofaj zgłoszenie</span>
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Wycofać zgłoszenie?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Czy na pewno chcesz wycofać zgłoszenie do tego spotkania?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={handleWithdrawApplication}>
                        Wycofaj
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <Button 
                className="w-full py-6 text-base font-semibold rounded-xl shadow-lg"
                onClick={handleJoinMeeting}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Dołącz
              </Button>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MeetingDetails;
