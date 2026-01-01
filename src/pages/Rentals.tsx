import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  MapPin, 
  ArrowLeft,
  Clock,
  CheckCircle,
  CreditCard,
  Users,
  User
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface RentalRequest {
  id: string;
  property_id: string;
  student_message: string | null;
  status: string;
  created_at: string;
  property_title: string;
  property_location: string;
  property_rent: number;
  property_image: string | null;
}

interface RoomAssignment {
  id: string;
  room_id: string;
  status: string;
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

type RentalStatus = 'none' | 'pending' | 'reserved' | 'active';

export default function Rentals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rentalStatus, setRentalStatus] = useState<RentalStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<RentalRequest[]>([]);
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);

  useEffect(() => {
    if (user) {
      fetchRentalData();
    }
  }, [user]);

  const fetchRentalData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Check for room assignment (reserved or active)
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('room_assignments')
        .select(`
          id,
          room_id,
          status,
          rooms!inner (
            room_number,
            property_id,
            properties!inner (
              title,
              location
            )
          )
        `)
        .eq('student_id', user.id)
        .maybeSingle();

      if (assignmentError && assignmentError.code !== 'PGRST116') {
        throw assignmentError;
      }

      if (assignmentData) {
        const room = assignmentData.rooms as any;
        const property = room.properties;
        
        setRoomAssignment({
          id: assignmentData.id,
          room_id: assignmentData.room_id,
          status: assignmentData.status,
          room_number: room.room_number,
          property_id: room.property_id,
          property_title: property.title,
          property_location: property.location,
        });

        if (assignmentData.status === 'active') {
          setRentalStatus('active');
          // Fetch roommates (only active ones in the same room)
          await fetchRoommates(assignmentData.room_id, user.id);
        } else {
          setRentalStatus('reserved');
        }
      } else {
        // 2. Check for pending rental requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('rental_requests')
          .select('*')
          .eq('student_id', user.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;

        if (requestsData && requestsData.length > 0) {
          // Fetch property details
          const propertyIds = [...new Set(requestsData.map(r => r.property_id))];
          const { data: propertiesData } = await supabase
            .from('properties')
            .select('id, title, location, rent_amount, images')
            .in('id', propertyIds);

          const propertiesMap = new Map(propertiesData?.map(p => [p.id, p]) || []);

          const enrichedRequests = requestsData.map(request => {
            const property = propertiesMap.get(request.property_id);
            return {
              id: request.id,
              property_id: request.property_id,
              student_message: request.student_message,
              status: request.status,
              created_at: request.created_at,
              property_title: property?.title || 'Unknown Property',
              property_location: property?.location || '',
              property_rent: property?.rent_amount || 0,
              property_image: property?.images?.[0] || null,
            };
          });

          setPendingRequests(enrichedRequests);
          setRentalStatus('pending');
        } else {
          setRentalStatus('none');
        }
      }
    } catch (error) {
      console.error('Error fetching rental data:', error);
      toast({
        title: "Error",
        description: "Failed to load rental information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRoommates = async (roomId: string, currentUserId: string) => {
    try {
      // Get other active students in the same room
      const { data: assignments, error } = await supabase
        .from('room_assignments')
        .select('student_id')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .neq('student_id', currentUserId);

      if (error) throw error;

      if (assignments && assignments.length > 0) {
        const studentIds = assignments.map(a => a.student_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname, avatar_url')
          .in('user_id', studentIds);

        if (profiles) {
          setRoommates(profiles.map(p => ({
            id: p.user_id,
            first_name: p.first_name,
            surname: p.surname,
            avatar_url: p.avatar_url,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching roommates:', error);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your rental request has been cancelled.",
      });
      fetchRentalData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Rental Status</h1>
          <Link to="/student-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* No Request State */}
        {rentalStatus === 'none' && (
          <Card className="text-center py-12">
            <CardContent>
              <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Active Requests</h3>
              <p className="text-muted-foreground mb-6">
                You haven't submitted any rental requests yet. Browse available properties to find your perfect room.
              </p>
              <Link to="/properties">
                <Button size="lg">Browse Properties</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Pending State */}
        {rentalStatus === 'pending' && (
          <div className="space-y-4">
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <h3 className="text-lg font-semibold">Request Under Review</h3>
                </div>
                <p className="text-muted-foreground">
                  Your rental request is being reviewed by the landlord. You'll be notified once they respond.
                </p>
              </CardContent>
            </Card>

            <h2 className="text-lg font-semibold">Pending Requests</h2>
            <div className="grid gap-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={request.property_image || "/placeholder.svg"}
                        alt={request.property_title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{request.property_title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {request.property_location}
                        </div>
                        <div className="text-sm font-medium text-primary mt-1">
                          ${request.property_rent}/month
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelRequest(request.id)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Reserved State - Awaiting Payment */}
        {rentalStatus === 'reserved' && roomAssignment && (
          <div className="space-y-4">
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-semibold">Awaiting Payment</h3>
                    <p className="text-muted-foreground">Your room has been reserved!</p>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{roomAssignment.property_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{roomAssignment.property_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Room {roomAssignment.room_number}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Please complete your payment to confirm your tenancy. Contact your landlord for payment details.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active Tenant State */}
        {rentalStatus === 'active' && roomAssignment && (
          <div className="space-y-6">
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-xl font-semibold">Active Tenant</h3>
                    <p className="text-muted-foreground">You're all set!</p>
                  </div>
                </div>
                
                <div className="bg-background rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{roomAssignment.property_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{roomAssignment.property_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="text-lg px-3 py-1 bg-green-600">
                      Room {roomAssignment.room_number}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Roommates Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Your Roommates
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roommates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    No other active tenants in your room yet.
                  </p>
                ) : (
                  <div className="grid gap-4">
                    {roommates.map((roommate) => (
                      <div key={roommate.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar>
                          <AvatarImage src={roommate.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {roommate.first_name} {roommate.surname}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
