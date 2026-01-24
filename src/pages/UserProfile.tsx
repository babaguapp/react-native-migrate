import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface UserProfile {
  user_id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  birth_date: string;
  gender: string;
}

interface UserPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<UserPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UserPhoto | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    const fetchData = async () => {
      try {
        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, full_name, username, avatar_url, bio, birth_date, gender")
          .eq("user_id", userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Fetch photos
        const { data: photosData, error: photosError } = await supabase
          .from("user_photos")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (photosError) throw photosError;
        setPhotos(photosData || []);
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId]);

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

  if (isLoading) {
    return (
      <MobileLayout title="Profil" showBack>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!profile) {
    return (
      <MobileLayout title="Profil" showBack>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nie znaleziono użytkownika</p>
        </div>
      </MobileLayout>
    );
  }

  // If viewing own profile, redirect message
  const isOwnProfile = currentUser?.id === userId;

  return (
    <MobileLayout title={isOwnProfile ? "Mój profil" : "Profil"} showBack>
      <div className="px-4 py-4 pb-24">
        {/* Profile Header */}
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
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{profile.full_name}</h1>
              <p className="text-muted-foreground">
                Wiek: {profile.birth_date ? calculateAge(profile.birth_date) : "?"} · <span className="text-primary font-medium">@{profile.username}</span>
              </p>
            </div>

            {/* Bio */}
            <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
              {profile.bio || "Brak opisu"}
            </p>
          </div>
        </div>

        {/* Photos Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Zdjęcia ({photos.length})</h2>

          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
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
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square bg-muted/30 rounded-lg"
                />
              ))}
            </div>
          )}
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
            <img
              src={selectedPhoto.photo_url}
              alt=""
              className="w-full aspect-square object-cover"
            />
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
