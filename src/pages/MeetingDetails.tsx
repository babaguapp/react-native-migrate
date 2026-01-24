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
  MapPin,
  Users,
  User,
  Share2,
  Edit3,
  X,
  Check,
  Trash2,
  Tag,
} from "lucide-react";
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
  participants: {
    user_id: string;
    status: string;
  }[];
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
    meeting?.participants.filter((p) => p.status === "confirmed").length || 0;

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
            status
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
    if (!meeting) return;

    try {
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

  const getGenderLabel = (preference: string) => {
    switch (preference) {
      case "female":
        return "Tylko kobiety";
      case "male":
        return "Tylko mężczyźni";
      default:
        return "Wszyscy";
    }
  };

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
    <MobileLayout title={meeting.activity.name} showBack>
      <div className="flex flex-col h-full">
        <Tabs defaultValue="info" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="info">Informacje</TabsTrigger>
            <TabsTrigger value="participants">Uczestnicy</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 overflow-auto px-4 pb-4">
            {/* Image */}
            <div className="relative w-full h-48 rounded-lg overflow-hidden mt-4 bg-muted">
              {meeting.image_url ? (
                <img
                  src={meeting.image_url}
                  alt={meeting.activity.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <span className="text-4xl">
                    {meeting.activity.category.icon || "📅"}
                  </span>
                </div>
              )}
            </div>

            {/* Meeting Info */}
            <div className="mt-4 space-y-4">
              {/* Activity & Category */}
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">{meeting.activity.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {meeting.activity.category.name}
                  </p>
                </div>
              </div>

              {/* City */}
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>{meeting.city}</span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span>
                  {format(new Date(meeting.meeting_date), "EEEE, d MMMM yyyy, HH:mm", {
                    locale: pl,
                  })}
                </span>
              </div>

              {/* Organizer */}
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div className="flex items-center gap-2">
                  {meeting.creator.avatar_url ? (
                    <img
                      src={meeting.creator.avatar_url}
                      alt={meeting.creator.full_name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                      {meeting.creator.full_name.charAt(0)}
                    </div>
                  )}
                  <span>{meeting.creator.full_name}</span>
                  {isCreator && (
                    <span className="text-xs text-muted-foreground">(Ty)</span>
                  )}
                </div>
              </div>

              {/* Participants */}
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>
                  {confirmedParticipants} / {meeting.max_participants} uczestników
                </span>
              </div>

              {/* Gender Preference */}
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <span>{getGenderLabel(meeting.gender_preference)}</span>
              </div>

              {/* Share Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Udostępnij spotkanie
              </Button>

              {/* Description */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Opis</h3>
                  {isCreator && !isEditingDescription && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDescription(true)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edytuj
                    </Button>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      placeholder="Dodaj opis spotkania..."
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingDescription(false);
                          setEditedDescription(meeting.description || "");
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Anuluj
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveDescription}
                        disabled={isSaving}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {isSaving ? "Zapisuję..." : "Zapisz"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {meeting.description || "Brak opisu"}
                  </p>
                )}
              </div>

              {/* Cancel Meeting (Only for creator) */}
              {isCreator && (
                <div className="border-t pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Anuluj spotkanie
                      </Button>
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
          </TabsContent>

          <TabsContent value="participants" className="flex-1 overflow-auto px-4 pb-4">
            <div className="mt-4">
              <p className="text-muted-foreground text-center py-8">
                Lista uczestników będzie dostępna wkrótce
              </p>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 overflow-auto px-4 pb-4">
            <div className="mt-4">
              <p className="text-muted-foreground text-center py-8">
                Chat będzie dostępny wkrótce
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
};

export default MeetingDetails;
