import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Settings as SettingsIcon, LogOut, ChevronRight, Pencil, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { StudentLayout } from "@/components/StudentLayout";

const UNIVERSITIES = [
  "University of Zimbabwe",
  "National University of Science and Technology",
  "Midlands State University",
  "Harare Institute of Technology",
  "Chinhoyi University of Technology",
  "Great Zimbabwe University",
  "Bindura University of Science Education",
  "Lupane State University",
];

const YEAR_LABELS: Record<string, string> = {
  "1": "1st Year",
  "2": "2nd Year",
  "3": "3rd Year",
  "4": "4th Year",
  postgrad: "Postgraduate",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

interface ProfileForm {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  gender: string;
  university: string;
  yearOfStudy: string;
  profilePicture: string;
}

export default function StudentProfile() {
  const navigate = useNavigate();
  const { user, profile: authProfile, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<ProfileForm>({
    firstName: "",
    surname: "",
    email: "",
    phone: "",
    gender: "",
    university: "",
    yearOfStudy: "",
    profilePicture: "",
  });
  const [originalProfile, setOriginalProfile] = useState<ProfileForm>(profile);

  useEffect(() => {
    if (authProfile) {
      const p: ProfileForm = {
        firstName: authProfile.first_name || "",
        surname: authProfile.surname || "",
        email: authProfile.email || "",
        phone: authProfile.phone || "",
        gender: authProfile.gender || "",
        university: authProfile.university || "",
        yearOfStudy: authProfile.year_of_study || "",
        profilePicture: authProfile.avatar_url || "",
      };
      setProfile(p);
      setOriginalProfile(p);
    }
  }, [authProfile]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!profile.firstName.trim()) e.firstName = "First name is required";
    if (!profile.surname.trim()) e.surname = "Surname is required";
    if (!profile.phone.trim()) e.phone = "Phone number is required";
    else if (!/^\+?[\d\s-]{7,15}$/.test(profile.phone.trim())) e.phone = "Invalid phone number";
    if (!profile.gender) e.gender = "Gender is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!user || !validate()) return;
    setLoading(true);
    try {
      await updateProfile({
        first_name: profile.firstName.trim(),
        surname: profile.surname.trim(),
        email: profile.email,
        phone: profile.phone.trim(),
        gender: profile.gender,
        university: profile.university,
        year_of_study: profile.yearOfStudy,
        avatar_url: profile.profilePicture,
      });
      setOriginalProfile(profile);
      setEditing(false);
      setErrors({});
      toast({ title: "Profile updated", description: "Your profile has been successfully updated." });
    } catch {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setEditing(false);
    setErrors({});
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
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setProfile((prev) => ({ ...prev, profilePicture: publicUrl }));
      toast({ title: "Picture uploaded" });
    } catch {
      toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <StudentLayout>
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>

        {/* Profile Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.profilePicture} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile.firstName[0]}{profile.surname[0]}
                  </AvatarFallback>
                </Avatar>
                {editing && (
                  <label htmlFor="profile-picture" className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-md">
                    <Camera className="h-3.5 w-3.5" />
                    <input type="file" id="profile-picture" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground">
                  {profile.firstName} {profile.surname}
                </h2>
                <p className="text-sm text-muted-foreground">Student</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        {editing ? (
          <Card>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs text-muted-foreground">First Name</Label>
                  <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} className="w-full" />
                  {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="surname" className="text-xs text-muted-foreground">Surname</Label>
                  <Input id="surname" value={profile.surname} onChange={(e) => setProfile({ ...profile, surname: e.target.value })} className="w-full" />
                  {errors.surname && <p className="text-xs text-destructive mt-1">{errors.surname}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="w-full" />
                  {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender" className="text-xs text-muted-foreground">Gender</Label>
                  <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="university" className="text-xs text-muted-foreground">University</Label>
                  <Select value={profile.university} onValueChange={(v) => setProfile({ ...profile, university: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIVERSITIES.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="yearOfStudy" className="text-xs text-muted-foreground">Year of Study</Label>
                  <Select value={profile.yearOfStudy} onValueChange={(v) => setProfile({ ...profile, yearOfStudy: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                      <SelectItem value="postgrad">Postgraduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Personal Information</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">First Name</p>
                  <p className="text-sm font-medium text-foreground break-words">{profile.firstName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Surname</p>
                  <p className="text-sm font-medium text-foreground break-words">{profile.surname || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="text-sm font-medium text-foreground break-words">{profile.email || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-sm font-medium text-foreground break-words">{profile.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Gender</p>
                  <p className="text-sm font-medium text-foreground break-words">{GENDER_LABELS[profile.gender] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">University</p>
                  <p className="text-sm font-medium text-foreground break-words">{profile.university || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Year of Study</p>
                  <p className="text-sm font-medium text-foreground break-words">{YEAR_LABELS[profile.yearOfStudy] || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
                  <Input id="firstName" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Surname</Label>
                  <Input id="surname" value={profile.surname} onChange={(e) => setProfile({ ...profile, surname: e.target.value })} />
                  {errors.surname && <p className="text-xs text-destructive">{errors.surname}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-destructive">{errors.gender}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="university">University</Label>
                <Select value={profile.university} onValueChange={(v) => setProfile({ ...profile, university: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIVERSITIES.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="yearOfStudy">Year of Study</Label>
                <Select value={profile.yearOfStudy} onValueChange={(v) => setProfile({ ...profile, yearOfStudy: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1st Year</SelectItem>
                    <SelectItem value="2">2nd Year</SelectItem>
                    <SelectItem value="3">3rd Year</SelectItem>
                    <SelectItem value="4">4th Year</SelectItem>
                    <SelectItem value="postgrad">Postgraduate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} className="flex-1" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">Personal Information</h3>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <p className="text-xs text-muted-foreground">First Name</p>
                  <p className="text-sm font-medium text-foreground">{profile.firstName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Surname</p>
                  <p className="text-sm font-medium text-foreground">{profile.surname || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium text-foreground">{profile.phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium text-foreground">{GENDER_LABELS[profile.gender] || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">University</p>
                  <p className="text-sm font-medium text-foreground">{profile.university || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Year of Study</p>
                  <p className="text-sm font-medium text-foreground">{YEAR_LABELS[profile.yearOfStudy] || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Menu Items */}
        <div className="space-y-2">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/settings")}>
            <CardContent className="p-4 flex items-center gap-3">
              <SettingsIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground flex-1">Settings</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleSignOut}>
            <CardContent className="p-4 flex items-center gap-3">
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-foreground flex-1">Sign Out</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
