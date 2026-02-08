import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Bell, Home, ChevronRight, LogOut, DollarSign, AlertCircle, Calendar, Building, TrendingUp, Clock, User, GraduationCap, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";

interface DashboardStats {
  totalProperties: number;
  totalTenants: number;
  pendingViewings: number;
  pendingRentals: number;
  activeComplaints: number;
}

interface RequestWithStudent {
  id: string;
  type: 'viewing' | 'rental';
  created_at: string;
  status: string;
  student_message?: string | null;
  property: {
    title: string;
    location: string;
  };
  student: {
    first_name: string | null;
    surname: string | null;
    avatar_url: string | null;
    university: string | null;
    year_of_study: string | null;
    gender: string | null;
    phone: string | null;
  };
}

const LandlordDashboard = () => {
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalTenants: 0,
    pendingViewings: 0,
    pendingRentals: 0,
    activeComplaints: 0,
  });
  const [recentRequests, setRecentRequests] = useState<RequestWithStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Landlord Dashboard | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Landlord dashboard for Linkier housing platform.");
    if (!meta.parentElement) document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;
    
    try {
      // Fetch all stats in parallel
      const [
        propertiesRes,
        tenantsRes,
        viewingsRes,
        rentalsRes,
        complaintsRes
      ] = await Promise.all([
        supabase.from('properties').select('id', { count: 'exact' }).eq('landlord_id', user.id),
        supabase.from('rentals').select('id', { count: 'exact' }).eq('landlord_id', user.id).eq('status', 'active'),
        supabase.from('property_viewings').select('id', { count: 'exact' }).eq('landlord_id', user.id).eq('status', 'pending'),
        supabase.from('rental_requests').select('id', { count: 'exact' }).eq('landlord_id', user.id).eq('status', 'pending'),
        supabase.from('complaints').select('id, property_id').in('status', ['pending', 'in_progress'])
      ]);

      // Filter complaints for landlord's properties
      let activeComplaints = 0;
      if (complaintsRes.data) {
        const propertyIds = (await supabase.from('properties').select('id').eq('landlord_id', user.id)).data?.map(p => p.id) || [];
        activeComplaints = complaintsRes.data.filter(c => propertyIds.includes(c.property_id)).length;
      }

      setStats({
        totalProperties: propertiesRes.count || 0,
        totalTenants: tenantsRes.count || 0,
        pendingViewings: viewingsRes.count || 0,
        pendingRentals: rentalsRes.count || 0,
        activeComplaints,
      });

      // Fetch recent pending requests with student info
      const [viewingRequests, rentalRequests] = await Promise.all([
        supabase
          .from('property_viewings')
          .select(`
            id,
            created_at,
            status,
            student_message,
            student_id,
            property_id
          `)
          .eq('landlord_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase
          .from('rental_requests')
          .select(`
            id,
            created_at,
            status,
            student_message,
            student_id,
            property_id
          `)
          .eq('landlord_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      // Combine and fetch related data
      const allRequests: RequestWithStudent[] = [];
      
      for (const viewing of viewingRequests.data || []) {
        const [propertyRes, studentRes] = await Promise.all([
          supabase.from('properties').select('title, location').eq('id', viewing.property_id).single(),
          supabase.from('profiles').select('first_name, surname, avatar_url, university, year_of_study, gender, phone').eq('user_id', viewing.student_id).single()
        ]);
        
        if (propertyRes.data && studentRes.data) {
          allRequests.push({
            id: viewing.id,
            type: 'viewing',
            created_at: viewing.created_at,
            status: viewing.status,
            student_message: viewing.student_message,
            property: propertyRes.data,
            student: studentRes.data
          });
        }
      }

      for (const rental of rentalRequests.data || []) {
        const [propertyRes, studentRes] = await Promise.all([
          supabase.from('properties').select('title, location').eq('id', rental.property_id).single(),
          supabase.from('profiles').select('first_name, surname, avatar_url, university, year_of_study, gender, phone').eq('user_id', rental.student_id).single()
        ]);
        
        if (propertyRes.data && studentRes.data) {
          allRequests.push({
            id: rental.id,
            type: 'rental',
            created_at: rental.created_at,
            status: rental.status,
            student_message: rental.student_message,
            property: propertyRes.data,
            student: studentRes.data
          });
        }
      }

      // Sort by date and take most recent 4
      allRequests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentRequests(allRequests.slice(0, 4));
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

  const menuItems = [
    { title: "My Properties", icon: Home, route: "/my-properties" },
    { title: "Requests", icon: Calendar, route: "/viewing-requests" },
    { title: "My Tenants", icon: Users, route: "/tenants" },
    { title: "Rent Tracking", icon: DollarSign, route: "/rent-tracking" },
    { title: "Complaints", icon: AlertCircle, route: "/complaints" },
  ];

  const statsCards = [
    { label: "Properties", value: stats.totalProperties, icon: Building, color: "text-blue-500" },
    { label: "Tenants", value: stats.totalTenants, icon: Users, color: "text-green-500" },
    { label: "Pending Requests", value: stats.pendingViewings + stats.pendingRentals, icon: Clock, color: "text-orange-500" },
    { label: "Active Issues", value: stats.activeComplaints, icon: AlertCircle, color: "text-red-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="md" />
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
        <div className="space-y-6">
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
                  <p className="text-sm text-muted-foreground">Landlord</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statsCards.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
                  <p className="text-2xl font-bold text-foreground">{loading ? "-" : stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Requests with Student Info */}
          {recentRequests.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Requests</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/viewing-requests")}>
                    View All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentRequests.map((request) => (
                  <Card 
                    key={`${request.type}-${request.id}`} 
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                    style={{ borderLeftColor: request.type === 'rental' ? 'hsl(var(--primary))' : 'hsl(142 76% 36%)' }}
                    onClick={() => navigate("/viewing-requests")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Student Avatar */}
                        <Avatar className="h-14 w-14 flex-shrink-0">
                          <AvatarImage src={request.student.avatar_url || ""} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {request.student.first_name?.[0] || "S"}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Request Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-foreground">
                              {request.student.first_name} {request.student.surname}
                            </span>
                            <Badge variant={request.type === 'rental' ? 'default' : 'secondary'} className="text-xs">
                              {request.type === 'rental' ? 'Rental' : 'Viewing'}
                            </Badge>
                          </div>
                          
                          {/* Student Info */}
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mb-2">
                            {request.student.university && (
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {request.student.university}
                              </span>
                            )}
                            {request.student.year_of_study && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {request.student.year_of_study}
                              </span>
                            )}
                            {request.student.gender && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.student.gender}
                              </span>
                            )}
                            {request.student.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {request.student.phone}
                              </span>
                            )}
                          </div>
                          
                          {/* Property Info */}
                          <p className="text-sm text-foreground truncate">
                            <Home className="h-3 w-3 inline mr-1" />
                            {request.property.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{request.property.location}</p>
                          
                          {/* Student Message Preview */}
                          {request.student_message && (
                            <p className="text-xs text-muted-foreground mt-2 italic line-clamp-1">
                              "{request.student_message}"
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Menu Items */}
          <div className="space-y-3">
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

export default LandlordDashboard;
