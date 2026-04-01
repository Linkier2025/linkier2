import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Settings, LogOut, Trash2, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LandlordProfile() {
  const navigate = useNavigate();
  const { user, profile: authProfile, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    profilePicture: "",
  });

  useEffect(() => {
    if (authProfile) {
      setProfile({
        firstName: authProfile.first_name || "",
        surname: authProfile.surname || "",
        email: authProfile.email || "",
        phone: authProfile.phone || "",
        profilePicture: authProfile.avatar_url || "",
      });
    }
  }, [authProfile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile({
        first_name: profile.firstName,
        surname: profile.surname,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.profilePicture,
      });
      toast({ title: "Profile updated" });
      setEditing(false);
    } catch {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const { validateAvatarFile } = await import("@/lib/validation");
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast({ title: "Invalid file", description: validation.error, variant: "destructive" });
      return;
    }

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setProfile({ ...profile, profilePicture: publicUrl });
      toast({ title: "Picture uploaded" });
    } catch {
      toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      await signOut();
      navigate("/");
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
    } catch {
      toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" });
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.profilePicture} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile.firstName[0]}
                    {profile.surname[0]}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="profile-picture" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    type="file"
                    id="profile-picture"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {profile.firstName} {profile.surname}
                </h2>
                <p className="text-sm text-muted-foreground">Landlord</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        {editing ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input
                    id="surname"
                    value={profile.surname}
                    onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setEditing(true)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <span className="font-medium text-foreground">Edit Profile</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {/* Menu Items */}
        <div className="space-y-2">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/settings")}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground flex-1">Settings</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleSignOut}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground flex-1">Sign Out</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-destructive/30"
            onClick={() => setShowDeleteDialog(true)}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <span className="font-medium text-destructive flex-1">Delete Account</span>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent. All your properties, tenants, and data will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
