import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Lock, LogOut, Trash2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account state
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const dashboardRoute = profile?.user_type === "landlord" ? "/landlord-dashboard" : "/student-dashboard";

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Please fill in both fields.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setPasswordLoading(true);
    try {
      // Verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: currentPassword,
      });
      if (signInError) {
        toast({ title: "Error", description: "Current password is incorrect.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Success", description: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update password.", variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;

    setDeleteLoading(true);
    setDeleteError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) {
        const errMsg = response.error.message || "Failed to delete account.";
        setDeleteError(errMsg);
        toast({ title: "Error", description: errMsg, variant: "destructive" });
        return;
      }

      const body = response.data;
      if (body?.error) {
        setDeleteError(body.error);
        toast({ title: "Error", description: body.error, variant: "destructive" });
        return;
      }

      toast({ title: "Account Deleted", description: "Your account has been permanently deleted.", variant: "destructive" });
      await signOut();
      navigate("/");
    } catch (error: any) {
      const msg = error.message || "Failed to delete account.";
      setDeleteError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={dashboardRoute}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* General — Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Danger Zone</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={() => setDeleteStep(1)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account — Step 1: Warning */}
      <Dialog open={deleteStep === 1} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot be undone. All your data, requests, and records will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteStep(0)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setDeleteStep(2); setDeleteConfirmText(""); setDeleteError(""); }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account — Step 2: Type DELETE */}
      <Dialog open={deleteStep === 2} onOpenChange={(open) => !open && setDeleteStep(0)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Final Confirmation</DialogTitle>
            <DialogDescription>
              Type <span className="font-bold text-foreground">DELETE</span> below to confirm account deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
            {deleteError && (
              <p className="text-sm text-destructive font-medium">{deleteError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteStep(0)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "DELETE" || deleteLoading}
              onClick={handleDeleteAccount}
            >
              {deleteLoading ? "Deleting..." : "Confirm Deletion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
