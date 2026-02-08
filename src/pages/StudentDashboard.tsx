import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import linkierLogo from "@/assets/linkier-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Home, 
  DollarSign, 
  Bell, 
  Search, 
  ChevronRight, 
  LogOut, 
  AlertCircle, 
  FileText,
  Calendar,
  Clock,
  MapPin,
  Eye,
  ClipboardList
} from "lucide-react";

interface DashboardStats {
  activeRental: boolean;
  pendingViewings: number;
  pendingRentals: number;
  activeComplaints: number;
  totalPayments: number;
}

interface ActiveRentalInfo {
  id: string;
  property_title: string;
  property_location: string;
  room_number: string | null;
  monthly_rent: number;
  lease_end: string;
}

interface PendingRequest {
  id: string;
  type: 'viewing' | 'rental';
  property_title: string;
  property_location: string;
  status: string;
  requested_at: string;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeRental: false,
    pendingViewings: 0,
    pendingRentals: 0,
    activeComplaints: 0,
    totalPayments: 0
  });
  const [activeRental, setActiveRental] = useState<ActiveRentalInfo | null>(null);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Student Dashboard | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Student dashboard for Linkier housing platform.");
    if (!meta.parentElement) document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch active rental
      const { data: rentals } = await supabase
        .from('rentals')
        .select(`
          id,
          room_number,
          monthly_rent,
          lease_end,
          properties (
            title,
            location
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .limit(1);

      // Fetch pending viewings count
      const { count: viewingsCount } = await supabase
        .from('property_viewings')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .in('status', ['pending', 'scheduled']);

      // Fetch pending rentals count
      const { count: rentalsCount } = await supabase
        .from('rental_requests')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('status', 'pending');

      // Fetch active complaints count
      const { count: complaintsCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .in('status', ['pending', 'in_progress']);

      // Fetch total payments made
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount, rental_id, rentals!inner(student_id)')
        .eq('rentals.student_id', user.id);

      const totalPayments = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch recent pending requests
      const { data: recentViewings } = await supabase
        .from('property_viewings')
        .select(`
          id,
          status,
          requested_at,
          properties (
            title,
            location
          )
        `)
        .eq('student_id', user.id)
        .in('status', ['pending', 'scheduled'])
        .order('requested_at', { ascending: false })
        .limit(3);

      const { data: recentRentals } = await supabase
        .from('rental_requests')
        .select(`
          id,
          status,
          requested_at,
          properties (
            title,
            location
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
        .limit(3);

      // Combine and format requests
      const allRequests: PendingRequest[] = [
        ...(recentViewings || []).map(v => ({
          id: v.id,
          type: 'viewing' as const,
          property_title: (v.properties as any)?.title || 'Unknown Property',
          property_location: (v.properties as any)?.location || '',
          status: v.status,
          requested_at: v.requested_at
        })),
        ...(recentRentals || []).map(r => ({
          id: r.id,
          type: 'rental' as const,
          property_title: (r.properties as any)?.title || 'Unknown Property',
          property_location: (r.properties as any)?.location || '',
          status: r.status,
          requested_at: r.requested_at
        }))
      ].sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime())
       .slice(0, 4);

      // Set active rental info
      if (rentals && rentals.length > 0) {
        const rental = rentals[0];
        setActiveRental({
          id: rental.id,
          property_title: (rental.properties as any)?.title || 'Unknown Property',
          property_location: (rental.properties as any)?.location || '',
          room_number: rental.room_number,
          monthly_rent: rental.monthly_rent,
          lease_end: rental.lease_end
        });
      } else {
        setActiveRental(null);
      }

      setStats({
        activeRental: (rentals && rentals.length > 0) || false,
        pendingViewings: viewingsCount || 0,
        pendingRentals: rentalsCount || 0,
        activeComplaints: complaintsCount || 0,
        totalPayments
      });

      setPendingRequests(allRequests);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      scheduled: "default",
      approved: "default",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const menuItems = [
    { title: "Search Property", icon: Search, route: "/properties" },
    { title: "My Requests", icon: FileText, route: "/viewing-requests" },
    { title: "My Room", icon: Home, route: "/rentals" },
    { title: "Rent Tracking", icon: DollarSign, route: "/rent-tracking" },
    { title: "Complaints", icon: AlertCircle, route: "/complaints" },
  ];

  const statsCards = [
    { 
      title: "Pending Viewings", 
      value: stats.pendingViewings, 
      icon: Eye,
      color: "text-blue-500"
    },
    { 
      title: "Pending Rentals", 
      value: stats.pendingRentals, 
      icon: ClipboardList,
      color: "text-purple-500"
    },
    { 
      title: "Active Complaints", 
      value: stats.activeComplaints, 
      icon: AlertCircle,
      color: "text-orange-500"
    },
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
            <ThemeToggle />
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
        <div className="space-y-6">
          {/* User Profile Card */}
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow" 
            onClick={() => navigate("/student-profile")}
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
                  <p className="text-sm text-muted-foreground">Student</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statsCards.map((stat) => (
                <Card key={stat.title}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">{stat.title}</span>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Active Rental Card */}
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ) : activeRental ? (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary"
              onClick={() => navigate("/rentals")}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Active Rental</h3>
                    </div>
                    <p className="text-lg font-medium text-foreground">{activeRental.property_title}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{activeRental.property_location}</span>
                    </div>
                    {activeRental.room_number && (
                      <p className="text-sm text-muted-foreground">Room: {activeRental.room_number}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">R{activeRental.monthly_rent}/mo</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-4 w-4" />
                      <span>Until {formatDate(activeRental.lease_end)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate("/properties")}
            >
              <CardContent className="p-6">
                <div className="text-center space-y-2">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto" />
                  <h3 className="font-semibold text-foreground">No Active Rental</h3>
                  <p className="text-sm text-muted-foreground">Browse properties to find your next room</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Requests */}
          {!loading && pendingRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Recent Requests</h3>
                <Button variant="ghost" size="sm" onClick={() => navigate("/viewing-requests")}>
                  View All
                </Button>
              </div>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <Card 
                    key={`${request.type}-${request.id}`}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate("/viewing-requests")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${request.type === 'viewing' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                            {request.type === 'viewing' ? (
                              <Eye className="h-4 w-4 text-blue-600" />
                            ) : (
                              <ClipboardList className="h-4 w-4 text-purple-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{request.property_title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(request.requested_at)}</span>
                              <span className="capitalize">• {request.type}</span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="space-y-2">
            {menuItems.map((item) => (
              <Card 
                key={item.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(item.route)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-foreground">{item.title}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
