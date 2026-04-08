import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Lock, LogOut, Trash2, AlertTriangle, Mail, Sun, Moon, Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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

  // Theme state
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // Password reset state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Delete account state
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const { isSupported: pushSupported, isSubscribed: pushEnabled, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();

  const dashboardRoute = profile?.user_type === "landlord" ? "/my-properties" : "/explore";

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({ title: "Error", description: "No email found for your account.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast({ title: "Email sent", description: "Password reset link sent to your email." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset email.", variant: "destructive" });
    } finally {
      setResetLoading(false);
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

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how Linkier looks for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Dark Mode</p>
                <p className="text-sm text-muted-foreground">
                  {isDark ? "Dark theme is active" : "Light theme is active"}
                </p>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              We'll send a password reset link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetSent ? (
              <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
                <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Reset link sent!</p>
                  <p className="text-sm text-muted-foreground">
                    Check your email at <span className="font-medium">{user?.email}</span> and follow the link to set a new password.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                A password reset link will be sent to <span className="font-medium text-foreground">{user?.email}</span>
              </p>
            )}
            <Button onClick={handlePasswordReset} disabled={resetLoading || resetSent}>
              {resetLoading ? "Sending..." : resetSent ? "Email Sent" : "Send Reset Link"}
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
