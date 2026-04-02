import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, MapPin, DoorOpen, DollarSign, Users, User, CheckCircle, AlertCircle, Megaphone } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [announcementsCount, setAnnouncementsCount] = useState(0);

  useEffect(() => {
    document.title = "My Stay | Linkier";
    if (user) fetchStayData();
  }, [user]);

  const fetchStayData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: assignmentData } = await (supabase
        .from("room_assignments")
        .select(`id, room_id, status, payment_status, rooms!inner(room_number, property_id, properties!inner(title, location))`)
        .eq("student_id", user.id)
        .eq("status", "active")
        .maybeSingle() as any);

      if (assignmentData) {
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
        const { count: cCount } = await supabase
          .from("complaints")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .in("status", ["pending", "in_progress"]);
        setComplaintsCount(cCount || 0);

        const { count: aCount } = await supabase
          .from("announcements")
          .select("*", { count: "exact", head: true })
          .eq("property_id", room.property_id);
        setAnnouncementsCount(aCount || 0);
      }
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

  return (
    <div className="px-4 pt-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground">My Stay</h1>

        {/* Room Info */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-foreground">Active Tenant</span>
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
        <Button variant="outline" className="w-full" onClick={() => navigate("/rent-tracking")}>
          <DollarSign className="h-4 w-4 mr-2" /> View Rent Tracking
        </Button>
    </div>
  );
}
