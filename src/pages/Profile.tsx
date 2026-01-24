import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCamera } from "@/hooks/useCamera";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Settings,
  Plus,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export default function Profile() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isNative, promptPhotoSource, photoToBlob, loading: cameraLoading } = useCamera();

  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [user]);

  const fetchPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_photos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle native camera photo upload
  const handleNativePhotoUpload = async () => {
    if (!user) return;

    const photo = await promptPhotoSource();
    if (!photo) return;

    setIsUploading(true);

    try {
      const blob = await photoToBlob(photo);
      if (!blob) throw new Error("Failed to convert photo");

      const fileExt = photo.format || 'jpeg';
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, blob, { contentType: `image/${fileExt}` });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("user-photos")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from("user_photos").insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      toast({
        title: "Dodano",
        description: "Zdjęcie zostało dodane",
      });

      fetchPhotos();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać zdjęcia",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle web file input upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Błąd",
        description: "Wybierz plik obrazu",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Błąd",
        description: "Maksymalny rozmiar pliku to 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("user-photos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("user-photos")
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase.from("user_photos").insert({
        user_id: user.id,
        photo_url: urlData.publicUrl,
      });

      if (dbError) throw dbError;

      toast({
        title: "Dodano",
        description: "Zdjęcie zostało dodane",
      });

      fetchPhotos();
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się dodać zdjęcia",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Combined handler - uses native camera on mobile, file input on web
  const handleAddPhotoClick = () => {
    if (isNative) {
      handleNativePhotoUpload();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDeletePhoto = async (photo: UserPhoto) => {
    if (!user) return;

    try {
      // Extract file path from URL
      const urlParts = photo.photo_url.split("/user-photos/");
      if (urlParts[1]) {
        await supabase.storage.from("user-photos").remove([urlParts[1]]);
      }

      // Delete from database
      const { error } = await supabase
        .from("user_photos")
        .delete()
        .eq("id", photo.id);

      if (error) throw error;

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      setShowPhotoDialog(false);
      setSelectedPhoto(null);

      toast({
        title: "Usunięto",
        description: "Zdjęcie zostało usunięte",
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć zdjęcia",
        variant: "destructive",
      });
    }
  };

  if (!profile) {
    return (
      <MobileLayout title="Mój profil" showBack>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  // Calculate age from birth_date
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <MobileLayout title="Mój profil" showBack>
      <div className="px-4 py-4 pb-24">
        {/* Profile Header - Instagram-like layout */}
        <div className="flex items-start gap-4">
          {/* Avatar - clickable to enlarge */}
          <button
            onClick={() => setShowAvatarDialog(true)}
            className="relative group flex-shrink-0"
          >
            <div className="p-1 rounded-full bg-gradient-to-tr from-primary via-purple-500 to-pink-500">
              <Avatar className="h-24 w-24 border-4 border-background">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-semibold">
                  {profile.full_name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute inset-1 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
          </button>

          {/* Profile Info */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">{profile.full_name}</h1>
                <p className="text-muted-foreground">
                  Wiek: {profile.birth_date ? calculateAge(profile.birth_date) : "?"} · <span className="text-primary font-medium">{profile.username}</span>
                </p>
              </div>
              
              {/* Settings button */}
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
              >
                <Settings className="h-6 w-6" />
              </button>
            </div>

            {/* Bio - always show, edit in Settings */}
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              {profile.bio || "Brak opisu"}
            </p>
          </div>
        </div>

        {/* Photos Section */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleAddPhotoClick}
              disabled={isUploading || cameraLoading}
              className="w-12 h-12 bg-muted/50 border border-border rounded-lg flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isUploading || cameraLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : isNative ? (
                <Camera className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Plus className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <h2 className="text-lg font-semibold">Zdjęcia ({photos.length}/10)</h2>
          </div>

          <div className="grid grid-cols-3 gap-1">

            {/* Photos */}
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => {
                  setSelectedPhoto(photo);
                  setShowPhotoDialog(true);
                }}
                className="aspect-square overflow-hidden rounded-lg"
              >
                <img
                  src={photo.photo_url}
                  alt=""
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </button>
            ))}

            {/* Empty state placeholders */}
            {photos.length === 0 &&
              Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted/30 rounded-lg"
                />
              ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>
      </div>

      {/* Avatar Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-transparent border-0">
          <div className="relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ) : (
              <div className="w-full aspect-square bg-primary/10 flex items-center justify-center rounded-lg">
                <span className="text-8xl text-primary font-bold">
                  {profile.full_name?.charAt(0) || "U"}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Dialog */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          {selectedPhoto && (
            <div>
              <img
                src={selectedPhoto.photo_url}
                alt=""
                className="w-full aspect-square object-cover"
              />
              <div className="p-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDeletePhoto(selectedPhoto)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń zdjęcie
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
