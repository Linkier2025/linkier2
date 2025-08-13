import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Home, Heart, Wallet, MessageSquare, AlertCircle, User, DollarSign } from "lucide-react";
import linkierLogo from "@/assets/linkier-logo.png";
const StudentDashboard = () => {
  const navigate = useNavigate();

  // Basic SEO handling
  useEffect(() => {
    document.title = "Student Dashboard | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Student dashboard for Linkier: manage profile, messages, rentals, payments and favorites.");
    if (!meta.parentElement) document.head.appendChild(meta);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    if (!canonical.parentElement) document.head.appendChild(canonical);
  }, []);
  return <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-hero">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={linkierLogo} alt="Linkier logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-white">Student Dashboard</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate("/")}>Sign out</Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Search */}
        <section>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search properties by location, price, amenities..." />
          </div>
        </section>

        {/* Quick actions */}
        <section aria-label="Quick actions" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/properties")}> 
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Browse Properties</p>
                <p className="text-sm text-muted-foreground">Find your next rental</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/student-profile")}> 
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Profile</p>
                <p className="text-sm text-muted-foreground">Edit your profile</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/favorites")}> 
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">My Favorites</p>
                <p className="text-sm text-muted-foreground">Saved listings</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/rentals")}> 
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">My Rentals</p>
                <p className="text-sm text-muted-foreground">Current leases</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/my-requests")}> 
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">My Requests</p>
                <p className="text-sm text-muted-foreground">Rental requests</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/complaints")}> 
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Complaints</p>
                <p className="text-sm text-muted-foreground">Report an issue</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 cursor-pointer" onClick={() => navigate("/payment-history")}> 
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Payment History</p>
                <p className="text-sm text-muted-foreground">View payment records</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Placeholder sections */}
        <section className="space-y-3">
          
          
        </section>
      </main>
    </div>;
};
export default StudentDashboard;