import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Camera,
  ChevronRight,
  Bell,
  Edit3,
  MapPin,
  MessageSquare,
  Star,
  Clock,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showEditNameDialog, setShowEditNameDialog] = useState(false);
  const [showEditBioDialog, setShowEditBioDialog] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedBio, setEditedBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Notification settings (local state for now)
  const [notifications, setNotifications] = useState({
    all: false,
    meetingChanges: true,
    meetingSuggestions: true,
    newMessages: true,
    ratingRequests: true,
    reminders: true,
  });

  useEffect(() => {
    if (profile) {
      setEditedName(profile.full_name || "");
      setEditedBio(profile.bio || "");
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Błąd",
        description: "Wybierz plik obrazu",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Błąd",
        description: "Maksymalny rozmiar pliku to 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("user-photos")
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl + "?t=" + Date.now() })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Zapisano",
        description: "Zdjęcie profilowe zostało zmienione",
      });

      // Refresh page to show new avatar
      window.location.reload();
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zmienić zdjęcia",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !editedName.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editedName.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      setShowEditNameDialog(false);
      toast({
        title: "Zapisano",
        description: "Imię i nazwisko zostało zaktualizowane",
      });
      window.location.reload();
    } catch (error) {
      console.error("Error updating name:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać zmian",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBio = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ bio: editedBio.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      setShowEditBioDialog(false);
      toast({
        title: "Zapisano",
        description: "Bio zostało zaktualizowane",
      });
      window.location.reload();
    } catch (error) {
      console.error("Error updating bio:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać zmian",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  if (!profile) {
    return (
      <MobileLayout title="Ustawienia" showBack>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Ustawienia" showBack>
      <div className="pb-24">
        {/* Avatar Section */}
        <div className="flex justify-center py-6">
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="relative"
          >
            <Avatar className="h-28 w-28">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-4xl font-semibold">
                {profile.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
              {isUploadingAvatar ? (
                <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-primary-foreground" />
              )}
            </div>
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        {/* OGÓLNE Section */}
        <div className="px-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Ogólne
          </p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-foreground">Nazwa użytkownika</span>
              <span className="text-muted-foreground">@{profile.username}</span>
            </div>
            <button
              onClick={() => {
                setEditedName(profile.full_name || "");
                setShowEditNameDialog(true);
              }}
              className="flex items-center justify-between px-4 py-3 w-full text-left"
            >
              <span className="text-foreground">Imię i nazwisko</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>{profile.full_name}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
            <button
              onClick={() => {
                setEditedBio(profile.bio || "");
                setShowEditBioDialog(true);
              }}
              className="flex items-center justify-between px-4 py-3 w-full text-left"
            >
              <span className="text-foreground">Bio (opis profilu)</span>
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>Edytuj</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-foreground">Data urodzin</span>
              <span className="text-muted-foreground">
                {profile.birth_date
                  ? format(new Date(profile.birth_date), "dd MMMM yyyy", { locale: pl })
                  : "Brak"}
              </span>
            </div>
          </div>
        </div>

        {/* DANE KONTAKTOWE Section */}
        <div className="px-4 mt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Dane kontaktowe
          </p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-foreground">Email</span>
              <span className="text-muted-foreground">{profile.email}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-foreground">Numer telefonu</span>
              <span className="text-muted-foreground">Brak</span>
            </div>
          </div>
        </div>

        {/* USTAWIENIA POWIADOMIEŃ Section */}
        <div className="px-4 mt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Ustawienia powiadomień
          </p>
          <div className="bg-card rounded-xl border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-white" />
                </div>
                <span className="text-foreground">Wszystkie powiadomienia</span>
              </div>
              <Switch
                checked={notifications.all}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, all: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Edit3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-foreground">Zmiany w spotkaniu</span>
              </div>
              <Switch
                checked={notifications.meetingChanges}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, meetingChanges: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-white" />
                </div>
                <span className="text-foreground">Proponowanie spotkań</span>
              </div>
              <Switch
                checked={notifications.meetingSuggestions}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, meetingSuggestions: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-white" />
                </div>
                <span className="text-foreground">Nowe wiadomości</span>
              </div>
              <Switch
                checked={notifications.newMessages}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, newMessages: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <span className="text-foreground">Prośby o ocenę</span>
              </div>
              <Switch
                checked={notifications.ratingRequests}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, ratingRequests: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <span className="text-foreground">Przypomnienia o spotkaniu</span>
              </div>
              <Switch
                checked={notifications.reminders}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, reminders: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 mt-8 flex justify-center">
          <Button
            variant="destructive"
            className="rounded-full px-12"
            onClick={handleSignOut}
          >
            Wyloguj się
          </Button>
        </div>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={showEditNameDialog} onOpenChange={setShowEditNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Imię i nazwisko</DialogTitle>
          </DialogHeader>
          <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            placeholder="Wpisz imię i nazwisko"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditNameDialog(false)}
            >
              Anuluj
            </Button>
            <Button onClick={handleSaveName} disabled={isSaving || !editedName.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bio Dialog */}
      <Dialog open={showEditBioDialog} onOpenChange={setShowEditBioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bio (opis profilu)</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editedBio}
            onChange={(e) => setEditedBio(e.target.value)}
            placeholder="Napisz coś o sobie..."
            rows={4}
            maxLength={150}
          />
          <p className="text-xs text-muted-foreground text-right">
            {editedBio.length}/150
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditBioDialog(false)}
            >
              Anuluj
            </Button>
            <Button onClick={handleSaveBio} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zapisz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
