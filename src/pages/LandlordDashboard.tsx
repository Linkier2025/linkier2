import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { User, Plus, Users, MessageSquare, Bell, Home } from "lucide-react";
import linkierLogo from "@/assets/linkier-logo.png";

const LandlordDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Basic SEO handling
  useEffect(() => {
    document.title = "Landlord Dashboard | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Landlord dashboard for Linkier housing platform.");
    if (!meta.parentElement) document.head.appendChild(meta);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-hero">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={linkierLogo} alt="Linkier logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-white">Landlord Dashboard</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="space-y-6">
          <div className="text-center py-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Welcome to Your Landlord Dashboard
            </h2>
            <p className="text-muted-foreground">
              Manage your properties, tenants, and communications all in one place.
            </p>
          </div>

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Profile Management */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/landlord-profile")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Edit your profile information and upload profile picture
                </p>
              </CardContent>
            </Card>

            {/* Add Property */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/add-property")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Property
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  List a new property for rent
                </p>
              </CardContent>
            </Card>

            {/* Tenants */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/tenants")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Tenants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  View and manage your accepted tenants
                </p>
              </CardContent>
            </Card>

            {/* Complaints */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/complaints")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Complaints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Handle tenant complaints and issues
                </p>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/notifications")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  View rental requests and messages
                </p>
              </CardContent>
            </Card>

            {/* Properties Overview */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/properties")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  View all your listed properties
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandlordDashboard;