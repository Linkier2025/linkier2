import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, MapPin, DoorOpen, DollarSign, Users, User, CheckCircle, AlertCircle, Megaphone, Moon, Ban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Skeleton } from "@/components/ui/skeleton";

interface RoomAssignment {
  id: string;
  room_id: string;
  status: string;
  payment_status: string;
  room_number: string;
  property_id: string;
  property_title: string;
  property_location: string;
}

interface Roommate {
  id: string;
  first_name: string | null;
  surname: string | null;
  avatar_url: string | null;
}

export default function MyStay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);

  const { markCategoryAsRead } = useUnreadNotifications();

  useEffect(() => {
    document.title = "My Stay | Linkier";
    if (user) {
      fetchStayData();
      markCategoryAsRead("myStay");
    }
  }, [user]);

  const fetchStayData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch active OR inactive assignment (not moved_out)
      const { data: assignmentData } = await (supabase
        .from("room_assignments")
        .select(`id, room_id, status, payment_status, rooms!inner(room_number, property_id, properties!inner(title, location))`)
        .eq("student_id", user.id)
        .in("status", ["active", "inactive"])
        .maybeSingle() as any);

      if (!assignmentData) {
        // Check if moved out
        const { data: movedOut } = await (supabase
          .from("room_assignments")
          .select(`id, room_id, status, payment_status, rooms!inner(room_number, property_id, properties!inner(title, location))`)
          .eq("student_id", user.id)
          .eq("status", "moved_out")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle() as any);

        if (movedOut) {
          const room = movedOut.rooms as any;
          const property = room.properties;
          setRoomAssignment({
            id: movedOut.id,
            room_id: movedOut.room_id,
            status: "moved_out",
            payment_status: movedOut.payment_status || "unpaid",
            room_number: room.room_number,
            property_id: room.property_id,
            property_title: property.title,
            property_location: property.location,
          });
        }
        setLoading(false);
        return;
      }

      const room = assignmentData.rooms as any;
      const property = room.properties;
      setRoomAssignment({
        id: assignmentData.id,
        room_id: assignmentData.room_id,
        status: assignmentData.status,
        payment_status: assignmentData.payment_status || "unpaid",
        room_number: room.room_number,
        property_id: room.property_id,
        property_title: property.title,
        property_location: property.location,
      });

      // Fetch roommates
      const { data: assignments } = await supabase
        .from("room_assignments")
        .select("student_id")
        .eq("room_id", assignmentData.room_id)
        .eq("status", "active")
        .neq("student_id", user.id);

      if (assignments && assignments.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, first_name, surname, avatar_url")
          .in("user_id", assignments.map(a => a.student_id));
        setRoommates((profiles || []).map(p => ({ id: p.user_id, first_name: p.first_name, surname: p.surname, avatar_url: p.avatar_url })));
      }

      // Fetch counts
      const { count: cCount } = await (supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .eq("room_assignment_id", assignmentData.id)
        .in("status", ["pending", "in_progress"]) as any);
      setComplaintsCount(cCount || 0);

      const { count: aCount } = await supabase
        .from("announcements")
        .select("*", { count: "exact", head: true })
        .eq("property_id", room.property_id);
      setAnnouncementsCount(aCount || 0);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // No assignment at all
  if (!roomAssignment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <Home className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">No Active Stay</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          You don't have an active room assignment yet.
        </p>
        <Button onClick={() => navigate("/explore")}>Browse Properties</Button>
      </div>
    );
  }

  // Moved out state
  if (roomAssignment.status === "moved_out") {
    return (
      <div className="px-4 pt-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground">My Stay</h1>
        <Card className="border-l-4 border-l-muted opacity-70">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Ban className="h-5 w-5 text-muted-foreground" />
              <span className="font-semibold text-muted-foreground">Moved Out</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-muted-foreground">{roomAssignment.property_title}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{roomAssignment.property_location}</span>
              </div>
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-muted-foreground">Room {roomAssignment.room_number}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardContent className="py-8 text-center">
            <Ban className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">You are no longer a tenant</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Apply for a new property to continue.
            </p>
            <Button onClick={() => navigate("/explore")}>Browse Properties</Button>
          </CardContent>
        </Card>

        {/* Read-only payment history link */}
        <Button variant="outline" className="w-full opacity-60" onClick={() => navigate("/student-rent-tracking")}>
          <DollarSign className="h-4 w-4 mr-2" /> View Payment History
        </Button>
      </div>
    );
  }

  const isInactive = roomAssignment.status === "inactive";

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">My Stay</h1>

      {/* Inactive notice */}
      {isInactive && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <CardContent className="p-3 flex items-center gap-2">
            <Moon className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">Your status is currently set to Inactive by your landlord.</span>
          </CardContent>
        </Card>
      )}

      {/* Room Info */}
      <Card className={`border-l-4 ${isInactive ? 'border-l-amber-500' : 'border-l-primary'}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className={`h-5 w-5 ${isInactive ? 'text-amber-500' : 'text-green-600'}`} />
            <span className="font-semibold text-foreground">
              {isInactive ? 'Inactive Tenant' : 'Active Tenant'}
            </span>
            <Badge className={isInactive ? 'bg-amber-500 text-white' : 'bg-green-600 text-white'}>
              {isInactive ? 'Inactive' : 'Active'}
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{roomAssignment.property_title}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{roomAssignment.property_location}</span>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline">Room {roomAssignment.room_number}</Badge>
            </div>
          </div>

          {/* Payment Status */}
          <div className={`mt-4 p-3 rounded-lg ${roomAssignment.payment_status === "paid" ? "bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800" : "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"}`}>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${roomAssignment.payment_status === "paid" ? "text-green-600" : "text-amber-600"}`} />
              <span className="text-sm font-medium">
                Rent: {roomAssignment.payment_status === "paid" ? "Paid" : "Unpaid"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/student-complaints")}>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium">Complaints</p>
              <p className="text-xs text-muted-foreground">{complaintsCount} active</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/student-announcements")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Announcements</p>
              <p className="text-xs text-muted-foreground">{announcementsCount} total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roommates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Roommates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roommates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No roommates yet</p>
          ) : (
            <div className="space-y-3">
              {roommates.map((rm) => (
                <div key={rm.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={rm.avatar_url || undefined} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{rm.first_name} {rm.surname}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rent Tracking Link */}
      <Button variant="outline" className="w-full" onClick={() => navigate("/student-rent-tracking")}>
        <DollarSign className="h-4 w-4 mr-2" /> View Rent Tracking
      </Button>
    </div>
  );
}
