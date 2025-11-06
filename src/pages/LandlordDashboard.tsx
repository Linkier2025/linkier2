import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Users, Bell, Home, ChevronRight, LogOut, DollarSign, AlertCircle, MessageSquare } from "lucide-react";
import linkierLogo from "@/assets/linkier-logo.png";

const LandlordDashboard = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

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

  const menuItems = [
    { title: "My Properties", icon: Home, route: "/my-properties" },
    { title: "My Tenants", icon: Users, route: "/tenants" },
    { title: "Rent Tracking", icon: DollarSign, route: "/rent-tracking" },
    { title: "Complaints", icon: AlertCircle, route: "/complaints" },
    { title: "Messages", icon: MessageSquare, route: "/messages" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={linkierLogo} alt="Linkier" className="h-10 w-10" />
            <h1 className="text-xl font-semibold text-foreground">Linkier</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/notifications")}>
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {/* User Profile Card */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => navigate("/landlord-profile")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.first_name || "User"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile?.first_name?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {profile?.first_name} {profile?.surname}
                  </h2>
                  <p className="text-sm text-muted-foreground">landlord</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          {menuItems.map((item) => (
            <Card 
              key={item.title}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(item.route)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium text-foreground">{item.title}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LandlordDashboard;