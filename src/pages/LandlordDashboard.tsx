import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Users, MessageSquare, Bell, AlertCircle, Home, User } from "lucide-react";
import linkierLogo from "@/assets/linkier-logo.png";

const LandlordDashboard = () => {
  const navigate = useNavigate();

  // Basic SEO handling
  useEffect(() => {
    document.title = "Landlord Dashboard | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Landlord dashboard for Linkier: manage properties, tenants, messages and notifications.");
    if (!meta.parentElement) document.head.appendChild(meta);

    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    if (!canonical.parentElement) document.head.appendChild(canonical);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-hero">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={linkierLogo} alt="Linkier logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-white">Landlord Dashboard</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Sign out</Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Quick actions */}
        <section aria-label="Quick actions" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/add-property")}> 
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Add Property</p>
                <p className="text-sm text-muted-foreground">List a new place</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/landlord-profile")}> 
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Profile</p>
                <p className="text-sm text-muted-foreground">Edit your profile</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/tenants")}> 
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Tenants</p>
                <p className="text-sm text-muted-foreground">Manage rooms</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/messages")}> 
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Messages</p>
                <p className="text-sm text-muted-foreground">Chat with students</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/notifications")}> 
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Notifications</p>
                <p className="text-sm text-muted-foreground">New requests</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/complaints")}> 
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Complaints</p>
                <p className="text-sm text-muted-foreground">Track issues</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/properties")}> 
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">My Properties</p>
                <p className="text-sm text-muted-foreground">View & edit</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Placeholder sections */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Welcome to Linkier</h2>
          <p className="text-sm text-muted-foreground">
            Start by adding a property or reviewing new requests. We’ll connect this to authentication and data once Supabase is enabled.
          </p>
        </section>
      </main>
    </div>
  );
};

export default LandlordDashboard;
