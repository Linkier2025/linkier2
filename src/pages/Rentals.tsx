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
  DollarSign,
  Users,
  User,
  DoorOpen,
  Gift
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RentalRequest {
  id: string;
  property_id: string;
  room_id: string | null;
  student_message: string | null;
  status: string;
  created_at: string;
  property_title: string;
  property_location: string;
  property_rent: number;
  property_image: string | null;
  room_number: string | null;
}

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

type RentalStatus = 'none' | 'pending' | 'offers' | 'active';

export default function Rentals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rentalStatus, setRentalStatus] = useState<RentalStatus>('none');
  const [pendingRequests, setPendingRequests] = useState<RentalRequest[]>([]);
  const [offers, setOffers] = useState<RentalRequest[]>([]);
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [roommates, setRoommates] = useState<Roommate[]>([]);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; offer: RentalRequest | null }>({ open: false, offer: null });

  useEffect(() => {
    if (user) {
      fetchRentalData();
    }
  }, [user]);

  const fetchRentalData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Check for active room assignment
      const { data: assignmentData, error: assignmentError } = await (supabase
        .from('room_assignments')
        .select(`
          id,
          room_id,
          status,
          payment_status,
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
        .eq('status', 'active')
        .maybeSingle() as any);

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
          payment_status: (assignmentData as any).payment_status || 'unpaid',
          room_number: room.room_number,
          property_id: room.property_id,
          property_title: property.title,
          property_location: property.location,
        });

        setRentalStatus('active');
        await fetchRoommates(assignmentData.room_id, user.id);
        return;
      }

      // 2. Fetch all non-terminal requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('rental_requests')
        .select('*')
        .eq('student_id', user.id)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      if (!requestsData || requestsData.length === 0) {
        setRentalStatus('none');
        setLoading(false);
        return;
      }

      // Enrich with property + room info
      const propertyIds = [...new Set(requestsData.map(r => r.property_id))];
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, location, rent_amount, images')
        .in('id', propertyIds);
      const propertiesMap = new Map(propertiesData?.map(p => [p.id, p]) || []);

      const roomIds = requestsData.filter(r => (r as any).room_id).map(r => (r as any).room_id);
      let roomsMap = new Map<string, string>();
      if (roomIds.length > 0) {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('id, room_number')
          .in('id', roomIds);
        roomsData?.forEach(r => roomsMap.set(r.id, r.room_number));
      }

      const enriched = requestsData.map(request => {
        const property = propertiesMap.get(request.property_id);
        return {
          id: request.id,
          property_id: request.property_id,
          room_id: (request as any).room_id || null,
          student_message: request.student_message,
          status: request.status,
          created_at: request.created_at,
          property_title: property?.title || 'Unknown Property',
          property_location: property?.location || '',
          property_rent: property?.rent_amount || 0,
          property_image: property?.images?.[0] || null,
          room_number: (request as any).room_id ? roomsMap.get((request as any).room_id) || null : null,
        };
      });

      const approvedOffers = enriched.filter(r => r.status === 'approved');
      const pendingReqs = enriched.filter(r => r.status === 'pending');

      setOffers(approvedOffers);
      setPendingRequests(pendingReqs);

      if (approvedOffers.length > 0) {
        setRentalStatus('offers');
      } else if (pendingReqs.length > 0) {
        setRentalStatus('pending');
      } else {
        setRentalStatus('none');
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

  const handleAcceptOffer = async () => {
    const offer = confirmDialog.offer;
    if (!offer) return;
    setAcceptingOffer(true);

    try {
      const { data, error } = await (supabase.rpc as any)('accept_offer', {
        p_request_id: offer.id,
      });

      if (error) throw error;

      toast({
        title: "Offer Accepted! 🎉",
        description: `You are now a tenant in Room ${(data as any)?.room_number}. All other requests have been cancelled.`,
      });
      setConfirmDialog({ open: false, offer: null });
      fetchRentalData();
    } catch (error: any) {
      console.error('Error accepting offer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept offer",
        variant: "destructive",
      });
    } finally {
      setAcceptingOffer(false);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your room request has been cancelled.",
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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Room</h1>
          <Link to="/student-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* No Request State */}
        {rentalStatus === 'none' && (
          <Card className="text-center py-12">
            <CardContent>
              <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Active Room</h3>
              <p className="text-muted-foreground mb-6">
                You haven't submitted any room requests yet. Browse properties to find your room.
              </p>
              <Link to="/properties">
                <Button size="lg">Browse Properties</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Offers Section */}
        {offers.length > 0 && rentalStatus !== 'active' && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Gift className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-semibold">You Have Offers!</h3>
                </div>
                <p className="text-muted-foreground">
                  A landlord has approved your request. Accept an offer to become a tenant. You can only accept one.
                </p>
              </CardContent>
            </Card>

            <h2 className="text-lg font-semibold">Your Offers</h2>
            <div className="grid gap-4">
              {offers.map((offer) => (
                <Card key={offer.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <img
                        src={offer.property_image || "/placeholder.svg"}
                        alt={offer.property_title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{offer.property_title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {offer.property_location}
                        </div>
                        {offer.room_number && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <DoorOpen className="h-3 w-3" />
                            Room {offer.room_number}
                          </div>
                        )}
                        <div className="text-sm font-medium text-primary mt-1">
                          ${offer.property_rent}/month
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className="bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approved
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setConfirmDialog({ open: true, offer })}
                        >
                          Accept Offer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Pending Requests */}
        {pendingRequests.length > 0 && rentalStatus !== 'active' && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-6 w-6 text-amber-600" />
                  <h3 className="text-lg font-semibold">Pending Requests</h3>
                </div>
                <p className="text-muted-foreground">
                  These requests are being reviewed by landlords. You'll receive an offer if approved.
                </p>
              </CardContent>
            </Card>

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
                        {request.room_number && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <DoorOpen className="h-3 w-3" />
                            Room {request.room_number}
                          </div>
                        )}
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

        {/* Active Tenant State */}
        {rentalStatus === 'active' && roomAssignment && (
          <div className="space-y-6">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="text-xl font-semibold">Active Tenant</h3>
                    <p className="text-muted-foreground">You're all set!</p>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{roomAssignment.property_title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>{roomAssignment.property_location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DoorOpen className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      Room {roomAssignment.room_number}
                    </Badge>
                  </div>
                </div>

                {/* Payment Status */}
                <div className={`mt-4 p-4 rounded-lg ${
                  roomAssignment.payment_status === 'paid' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <DollarSign className={`h-5 w-5 ${
                      roomAssignment.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'
                    }`} />
                    <span className="font-medium">
                      Rent Status: {roomAssignment.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                  {roomAssignment.payment_status !== 'paid' && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Please pay your rent to the landlord outside the platform.
                    </p>
                  )}
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
                    No other tenants in your room yet.
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

        {/* Accept Offer Confirmation */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept This Offer?</AlertDialogTitle>
              <AlertDialogDescription>
                You will become a tenant at <strong>{confirmDialog.offer?.property_title}</strong>
                {confirmDialog.offer?.room_number && <> in <strong>Room {confirmDialog.offer.room_number}</strong></>}.
                <br /><br />
                <strong>Important:</strong> All your other pending and approved requests will be automatically cancelled. You can only be a tenant in one room.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={acceptingOffer}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleAcceptOffer}
                disabled={acceptingOffer}
                className="bg-green-600 hover:bg-green-700"
              >
                {acceptingOffer ? 'Accepting...' : 'Accept Offer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
