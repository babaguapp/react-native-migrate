import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, UserX, Loader2 } from "lucide-react";
import { notifyParticipantAccepted } from "@/lib/notifications";

interface Candidate {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  profile: {
    full_name: string;
    username: string;
    avatar_url: string | null;
    bio: string | null;
    gender: string;
  };
}

interface Meeting {
  id: string;
  creator_id: string;
  activity: {
    name: string;
  };
}

const MeetingCandidates = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    if (!id) return;

    try {
      // Fetch meeting to verify ownership
      const { data: meetingData, error: meetingError } = await supabase
        .from("meetings")
        .select(`
          id,
          creator_id,
          activity:activities(name)
        `)
        .eq("id", id)
        .maybeSingle();

      if (meetingError) throw meetingError;

      if (!meetingData) {
        toast({
          title: "Błąd",
          description: "Nie znaleziono spotkania",
          variant: "destructive",
        });
        navigate("/meetings");
        return;
      }

      // Check if user is the creator
      if (meetingData.creator_id !== user?.id) {
        toast({
          title: "Brak dostępu",
          description: "Tylko organizator może przeglądać kandydatów",
          variant: "destructive",
        });
        navigate(`/meeting/${id}`);
        return;
      }

      setMeeting(meetingData as unknown as Meeting);

      // Fetch pending candidates
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("meeting_participants")
        .select(`
          id,
          user_id,
          status,
          joined_at,
          profile:profiles!meeting_participants_user_id_fkey(
            full_name,
            username,
            avatar_url,
            bio,
            gender
          )
        `)
        .eq("meeting_id", id)
        .eq("status", "pending")
        .order("joined_at", { ascending: true });

      if (candidatesError) throw candidatesError;

      setCandidates(candidatesData as unknown as Candidate[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać danych",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (candidateId: string, candidateUserId: string, candidateName: string) => {
    setProcessingId(candidateId);
    try {
      const { error } = await supabase
        .from("meeting_participants")
        .update({ status: "accepted" })
        .eq("id", candidateId);

      if (error) throw error;

      // Get all current accepted participants to notify them
      const { data: acceptedParticipants } = await supabase
        .from("meeting_participants")
        .select("user_id")
        .eq("meeting_id", id)
        .eq("status", "accepted")
        .neq("user_id", candidateUserId);

      const participantIds = acceptedParticipants?.map((p) => p.user_id) || [];

      // Notify other accepted participants about the new member
      if (participantIds.length > 0) {
        await notifyParticipantAccepted(
          participantIds,
          candidateName,
          id!,
          candidateUserId
        );
      }

      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
      toast({
        title: "Zaakceptowano",
        description: "Uczestnik został dodany do spotkania",
      });
    } catch (error) {
      console.error("Error accepting candidate:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zaakceptować kandydata",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (candidateId: string) => {
    setProcessingId(candidateId);
    try {
      const { error } = await supabase
        .from("meeting_participants")
        .delete()
        .eq("id", candidateId);

      if (error) throw error;

      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
      toast({
        title: "Odrzucono",
        description: "Zgłoszenie zostało odrzucone",
      });
    } catch (error) {
      console.error("Error rejecting candidate:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się odrzucić kandydata",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getGenderLabel = (gender: string) => {
    switch (gender) {
      case "female":
        return "Kobieta";
      case "male":
        return "Mężczyzna";
      default:
        return gender;
    }
  };

  if (isLoading) {
    return (
      <MobileLayout title="Kandydaci" showBack>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Kandydaci" showBack>
      <div className="px-4 py-4 pb-24">
        {meeting && (
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">
              {meeting.activity.name}
            </h1>
            <p className="text-muted-foreground">
              {candidates.length} oczekujących zgłoszeń
            </p>
          </div>
        )}

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">
              Brak oczekujących zgłoszeń
            </p>
            <p className="text-muted-foreground mb-6">
              Gdy ktoś zgłosi chęć dołączenia, zobaczysz to tutaj
            </p>
            <Button variant="outline" onClick={() => navigate(`/meeting/${id}`)}>
              Wróć do spotkania
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm"
              >
                <div 
                  className="flex items-start gap-4 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/user/${candidate.user_id}`)}
                >
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={candidate.profile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {candidate.profile.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {candidate.profile.full_name}
                    </h3>
                    <p className="text-sm text-primary">
                      @{candidate.profile.username}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getGenderLabel(candidate.profile.gender)}
                    </p>
                    {candidate.profile.bio && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {candidate.profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleReject(candidate.id)}
                    disabled={processingId === candidate.id}
                  >
                    {processingId === candidate.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Odrzuć
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleAccept(candidate.id, candidate.user_id, candidate.profile.full_name)}
                    disabled={processingId === candidate.id}
                  >
                    {processingId === candidate.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Akceptuj
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default MeetingCandidates;
