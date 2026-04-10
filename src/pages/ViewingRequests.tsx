import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, MapPin, Home, Mail, Phone, GraduationCap, User, MessageSquare, Check, X, DoorOpen, Gift, CheckCircle } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";

interface StudentInfo {
  first_name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  university: string | null;
  year_of_study: string | null;
  gender: string | null;
}

interface ViewingRequest {
  id: string;
  property_id: string;
  student_id: string;
  landlord_id: string;
  status: string;
  requested_at: string;
  scheduled_date: string | null;
  student_message: string | null;
  landlord_notes: string | null;
  property: {
    title: string;
    location: string;
    rent_amount?: number;
    images?: string[] | null;
  };
  student?: StudentInfo | null;
}

interface RentalRequest {
  id: string;
  property_id: string;
  student_id: string;
  landlord_id: string;
  status: string;
  requested_at: string;
  student_message: string | null;
  preferred_room_id: string | null;
  preferred_room_number: string | null;
  assigned_room_id: string | null;
  assigned_room_number: string | null;
  property: {
    title: string;
    location: string;
    rent_amount: number;
    images: string[] | null;
  };
  student?: StudentInfo | null;
}

export default function ViewingRequests() {
  const { user, profile } = useAuth();
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<ViewingRequest | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [landlordNotes, setLandlordNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [assignRoomDialog, setAssignRoomDialog] = useState<{ open: boolean; request: RentalRequest | null }>({ open: false, request: null });
  const [availableRooms, setAvailableRooms] = useState<{ id: string; room_number: string; capacity: number; current_occupants: number }[]>([]);
  const [selectedAssignRoomId, setSelectedAssignRoomId] = useState<string>("");

  const isLandlord = profile?.user_type === 'landlord';

  const { markCategoryAsRead } = useUnreadNotifications();

  useEffect(() => {
    if (user && profile) {
      fetchAllRequests();
      markCategoryAsRead("requests");
    }
  }, [user, profile]);

  // Refetch on app resume
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && user && profile) {
        fetchAllRequests();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [user, profile]);

  const [confirmOfferDialog, setConfirmOfferDialog] = useState<{ open: boolean; request: RentalRequest | null }>({ open: false, request: null });
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [hasActiveTenant, setHasActiveTenant] = useState(false);

  const fetchAllRequests = async () => {
    if (!user || !profile) return;
    const landlord = profile.user_type === 'landlord';
    setLoading(true);
    await Promise.all([fetchViewings(landlord), fetchRentalRequests(landlord), checkActiveTenant()]);
    setLoading(false);
  };

  const checkActiveTenant = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('room_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'active');
    setHasActiveTenant((count || 0) > 0);
  };

  const fetchViewings = async (landlord: boolean) => {
    if (!user) return;

    try {
      let query = supabase
        .from('property_viewings')
        .select(`
          *,
          property:properties(title, location, rent_amount, images)
        `)
        .order('requested_at', { ascending: false });

      if (landlord) {
        query = query.eq('landlord_id', user.id);
      } else {
        query = query.eq('student_id', user.id);
      }

      const { data: viewingsData, error } = await query;
      if (error) throw error;

      const studentIds = [...new Set(viewingsData?.map(v => v.student_id) || [])];
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('user_id, first_name, surname, phone, email, avatar_url, university, year_of_study, gender')
        .in('user_id', studentIds);

      const viewingsWithStudents = viewingsData?.map(viewing => ({
        ...viewing,
        student: studentsData?.find(s => s.user_id === viewing.student_id) || null
      })) || [];

      setViewings(viewingsWithStudents);
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast({
        title: "Error",
        description: "Failed to load viewing requests.",
        variant: "destructive"
      });
    }
  };

  const fetchRentalRequests = async (landlord: boolean) => {
    if (!user) return;

    try {
      let query = supabase
        .from('rental_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (landlord) {
        query = query.eq('landlord_id', user.id);
      } else {
        query = query.eq('student_id', user.id);
      }

      const { data: requestsData, error } = await query;
      if (error) throw error;

      const requestsWithDetails = await Promise.all(
        (requestsData || []).map(async (request: any) => {
          const { data: propertyData } = await supabase
            .from('properties')
            .select('title, location, rent_amount, images')
            .eq('id', request.property_id)
            .maybeSingle();

          const { data: studentData } = await supabase
            .from('profiles')
            .select('first_name, surname, email, phone, avatar_url, university, year_of_study, gender')
            .eq('user_id', request.student_id)
            .maybeSingle();

          // Fetch preferred room number
          let preferredRoomNumber: string | null = null;
          if (request.preferred_room_id) {
            const { data: roomData } = await supabase
              .from('rooms')
              .select('room_number')
              .eq('id', request.preferred_room_id)
              .maybeSingle();
            preferredRoomNumber = roomData?.room_number || null;
          }

          // Fetch assigned room number
          let assignedRoomNumber: string | null = null;
          if (request.assigned_room_id) {
            const { data: roomData } = await supabase
              .from('rooms')
              .select('room_number')
              .eq('id', request.assigned_room_id)
              .maybeSingle();
            assignedRoomNumber = roomData?.room_number || null;
          }

          return {
            ...request,
            preferred_room_id: request.preferred_room_id || null,
            preferred_room_number: preferredRoomNumber,
            assigned_room_id: request.assigned_room_id || null,
            assigned_room_number: assignedRoomNumber,
            property: propertyData || { title: 'Unknown', location: 'Unknown', rent_amount: 0, images: null },
            student: studentData
          };
        })
      );

      setRentalRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching rental requests:', error);
    }
  };

  const handleScheduleViewing = async () => {
    if (!selectedViewing || !scheduledDate) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({
          status: 'scheduled',
          scheduled_date: scheduledDate,
          landlord_notes: landlordNotes
        })
        .eq('id', selectedViewing.id);

      if (error) throw error;

      toast({
        title: "Viewing scheduled!",
        description: "The student has been notified.",
      });
      setScheduleDialogOpen(false);
      setSelectedViewing(null);
      setScheduledDate("");
      setLandlordNotes("");
      fetchAllRequests();
    } catch (error) {
      console.error('Error scheduling viewing:', error);
      toast({
        title: "Error",
        description: "Failed to schedule viewing.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkCompleted = async (viewingId: string) => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: 'completed' })
        .eq('id', viewingId);

      if (error) throw error;
      toast({ title: "Viewing marked as completed" });
      fetchAllRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    }
  };

  const handleDeclineViewing = async (viewingId: string) => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: 'cancelled' })
        .eq('id', viewingId);

      if (error) throw error;
      toast({ title: "Viewing request declined" });
      fetchAllRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to decline.", variant: "destructive" });
    }
  };

  const handleCancelViewing = async (viewingId: string) => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: 'cancelled' })
        .eq('id', viewingId);

      if (error) throw error;
      toast({ title: "Request cancelled" });
      fetchAllRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel.", variant: "destructive" });
    }
  };

  const handleAcceptRental = async (request: RentalRequest, overrideRoomId?: string) => {
    setUpdating(true);
    try {
      const params: any = { p_request_id: request.id };
      if (overrideRoomId) {
        params.p_assigned_room_id = overrideRoomId;
      }
      const { data, error } = await supabase.rpc('accept_rental_request', params);

      if (error) throw error;

      toast({
        title: "Offer Sent",
        description: "The student has been notified. They must accept the offer to become a tenant.",
      });
      setAssignRoomDialog({ open: false, request: null });
      setSelectedAssignRoomId("");
      fetchAllRequests();
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept request.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenAssignRoom = async (request: RentalRequest) => {
    // Fetch available rooms for this property
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('id, room_number, capacity')
      .eq('property_id', request.property_id)
      .eq('type', 'bedroom');

    if (roomsData) {
      // Get current occupants for each room
      const roomsWithOccupants = await Promise.all(
        roomsData.map(async (room) => {
          const { count } = await supabase
            .from('room_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .in('status', ['active', 'reserved']);
          return { ...room, current_occupants: count || 0 };
        })
      );
      setAvailableRooms(roomsWithOccupants.filter(r => r.capacity && r.current_occupants < r.capacity));
    }
    setSelectedAssignRoomId("");
    setAssignRoomDialog({ open: true, request });
  };

  const handleDeclineRental = async (request: RentalRequest) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ status: 'declined' })
        .eq('id', request.id);

      if (error) throw error;
      toast({ title: "Request declined" });
      fetchAllRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to decline.", variant: "destructive" });
    }
  };

  const handleCancelRental = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      toast({ title: "Request cancelled" });
      fetchAllRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to cancel.", variant: "destructive" });
    }
  };

  const handleAcceptOffer = async () => {
    const request = confirmOfferDialog.request;
    if (!request) return;
    setAcceptingOffer(true);
    try {
      const { data, error } = await (supabase.rpc as any)('accept_offer', {
        p_request_id: request.id,
      });
      if (error) throw error;
      toast({
        title: "Offer Accepted! 🎉",
        description: `You are now a tenant! All other requests have been cancelled.`,
      });
      setConfirmOfferDialog({ open: false, request: null });
      fetchAllRequests();
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

  const handleDeclineOffer = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
      if (error) throw error;
      toast({ title: "Offer declined" });
      fetchAllRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to decline offer.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      scheduled: "default",
      completed: "outline",
      cancelled: "destructive",
      approved: "default",
      accepted: "default",
      declined: "destructive"
    };
    const labels: Record<string, string> = {
      pending: "Pending",
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      approved: "Offer Sent",
      accepted: "Accepted",
      declined: "Rejected"
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getStudentInitials = (student: StudentInfo | null | undefined) => {
    if (!student) return "?";
    const first = student.first_name?.[0] || "";
    const last = student.surname?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  const StudentInfoCard = ({ student }: { student: StudentInfo | null | undefined }) => {
    if (!student) return null;
    
    return (
      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
        <Avatar className="h-14 w-14">
          <AvatarImage src={student.avatar_url || undefined} />
          <AvatarFallback>{getStudentInitials(student)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h3 className="font-semibold">
            {student.first_name} {student.surname}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
            {student.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {student.email}
              </div>
            )}
            {student.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {student.phone}
              </div>
            )}
            {student.university && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                {student.university}
                {student.year_of_study && ` - ${student.year_of_study}`}
              </div>
            )}
            {student.gender && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {student.gender}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const pendingRentalRequests = rentalRequests.filter(r => r.status === 'pending');
  const approvedRentalRequests = rentalRequests.filter(r => r.status === 'approved');
  const otherRentalRequests = rentalRequests.filter(r => !['pending', 'approved'].includes(r.status));

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">
          {isLandlord ? "Property Requests" : "My Requests"}
        </h1>

        <Tabs defaultValue="rental" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rental" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Room ({rentalRequests.length})
            </TabsTrigger>
            <TabsTrigger value="viewing" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Viewing ({viewings.length})
            </TabsTrigger>
          </TabsList>

          {/* Rental Requests Tab */}
          <TabsContent value="rental" className="space-y-4 mt-4">
            {rentalRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No room requests</h3>
                  <p className="text-muted-foreground">
                    {isLandlord ? "No room requests received yet." : "You haven't requested any rooms yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Pending Requests - For Landlords */}
                {isLandlord && pendingRentalRequests.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Pending Requests</h2>
                    {pendingRentalRequests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{request.property.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {request.property.location}
                              </div>
                              {request.preferred_room_number && (
                                <div className="flex items-center gap-2 mt-1 text-sm">
                                  <DoorOpen className="h-4 w-4 text-primary" />
                                  <span className="font-medium">Preferred Room: {request.preferred_room_number}</span>
                                </div>
                              )}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <StudentInfoCard student={request.student} />

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Requested: {format(new Date(request.requested_at), "PPP")}
                          </div>

                          {request.student_message && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <MessageSquare className="h-4 w-4" />
                                Student's Message
                              </div>
                              <p className="text-sm text-muted-foreground">{request.student_message}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            <Button
                              className="flex-1"
                              variant="default"
                              onClick={() => handleAcceptRental(request)}
                              disabled={updating}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              {request.preferred_room_number ? `Approve (${request.preferred_room_number})` : "Approve"}
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleOpenAssignRoom(request)}
                              disabled={updating}
                            >
                              <DoorOpen className="h-4 w-4 mr-2" />
                              Assign Different Room
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeclineRental(request)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Student: Offers Section */}
                {!isLandlord && approvedRentalRequests.length > 0 && (
                  <div className="space-y-4">
                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <Gift className="h-6 w-6 text-primary" />
                          <h3 className="text-lg font-semibold">You Have Offers!</h3>
                        </div>
                        <p className="text-muted-foreground">
                          {hasActiveTenant
                            ? "You already have an active room. You cannot accept more offers."
                            : "A landlord has approved your request. Accept an offer to become a tenant."}
                        </p>
                      </CardContent>
                    </Card>

                    {approvedRentalRequests.map((request) => (
                      <Card key={request.id} className="border-primary/30">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{request.property.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {request.property.location}
                              </div>
                              {request.preferred_room_number && (
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <DoorOpen className="h-4 w-4" />
                                  Requested: {request.preferred_room_number}
                                </div>
                              )}
                              {request.assigned_room_number && (
                                <div className="flex items-center gap-2 mt-1 text-sm font-medium text-primary">
                                  <DoorOpen className="h-4 w-4" />
                                  Assigned: {request.assigned_room_number}
                                  {request.preferred_room_number && request.assigned_room_number !== request.preferred_room_number && (
                                    <Badge variant="outline" className="text-xs ml-1">Changed</Badge>
                                  )}
                                </div>
                              )}
                              {request.property.rent_amount && (
                                <div className="text-sm font-medium text-primary mt-1">
                                  R{request.property.rent_amount}/month
                                </div>
                              )}
                            </div>
                            <Badge className="bg-primary">Offer Sent</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Requested: {format(new Date(request.requested_at), "PPP")}
                          </div>

                          {request.student_message && (
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <MessageSquare className="h-4 w-4" />
                                Your Message
                              </div>
                              <p className="text-sm text-muted-foreground">{request.student_message}</p>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {hasActiveTenant ? (
                              <Button disabled className="flex-1">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Already a tenant
                              </Button>
                            ) : (
                              <>
                                <Button
                                  className="flex-1"
                                  onClick={() => setConfirmOfferDialog({ open: true, request })}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Accept Offer
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => handleDeclineOffer(request.id)}
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Student: Pending Requests */}
                {!isLandlord && pendingRentalRequests.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Pending Requests</h2>
                    {pendingRentalRequests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{request.property.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {request.property.location}
                              </div>
                              {request.preferred_room_number && (
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <DoorOpen className="h-4 w-4" />
                                  Preferred: {request.preferred_room_number}
                                </div>
                              )}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Requested: {format(new Date(request.requested_at), "PPP")}
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleCancelRental(request.id)}
                          >
                            Cancel Request
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Student: No offers empty state */}
                {!isLandlord && approvedRentalRequests.length === 0 && pendingRentalRequests.length === 0 && rentalRequests.length > 0 && (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <Gift className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-semibold mb-1">No offers yet</h3>
                      <p className="text-muted-foreground">Keep applying to rooms. You'll see offers here when a landlord approves your request.</p>
                    </CardContent>
                  </Card>
                )}

                {/* Landlord: Other/History Requests */}
                {isLandlord && otherRentalRequests.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Previous Requests</h2>
                    {otherRentalRequests.map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{request.property.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {request.property.location}
                              </div>
                              {request.preferred_room_number && (
                                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                  <DoorOpen className="h-4 w-4" />
                                  Preferred: {request.preferred_room_number}
                                </div>
                              )}
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <StudentInfoCard student={request.student} />
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Requested: {format(new Date(request.requested_at), "PPP")}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Student: Request History */}
                {!isLandlord && rentalRequests.filter(r => ['accepted', 'declined', 'cancelled', 'rejected'].includes(r.status)).length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Request History</h2>
                    {rentalRequests.filter(r => ['accepted', 'declined', 'cancelled', 'rejected'].includes(r.status)).map((request) => (
                      <Card key={request.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle>{request.property.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                {request.property.location}
                              </div>
                            </div>
                            {getStatusBadge(request.status)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {request.status === 'accepted' && (
                            <Badge variant="outline" className="text-primary border-primary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              You are now a tenant
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Viewing Requests Tab */}
          <TabsContent value="viewing" className="space-y-4 mt-4">
            {viewings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No viewing requests</h3>
                  <p className="text-muted-foreground">
                    {isLandlord ? "No viewing requests received yet." : "You haven't requested any viewings yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              viewings.map((viewing) => (
                <Card key={viewing.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{viewing.property.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {viewing.property.location}
                        </div>
                      </div>
                      {getStatusBadge(viewing.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLandlord && <StudentInfoCard student={viewing.student} />}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Requested: {format(new Date(viewing.requested_at), "PPP")}
                    </div>

                    {viewing.scheduled_date && (
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        Scheduled: {format(new Date(viewing.scheduled_date), "PPP p")}
                      </div>
                    )}

                    {viewing.student_message && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <MessageSquare className="h-4 w-4" />
                          {isLandlord ? "Student's Message" : "Your Message"}
                        </div>
                        <p className="text-sm text-muted-foreground">{viewing.student_message}</p>
                      </div>
                    )}

                    {viewing.landlord_notes && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <MessageSquare className="h-4 w-4" />
                          Landlord Notes
                        </div>
                        <p className="text-sm text-muted-foreground">{viewing.landlord_notes}</p>
                      </div>
                    )}

                    {/* Landlord Actions */}
                    {isLandlord && viewing.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() => {
                            setSelectedViewing(viewing);
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          Schedule
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDeclineViewing(viewing.id)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {isLandlord && viewing.status === 'scheduled' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleMarkCompleted(viewing.id)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Mark Completed
                        </Button>
                      </div>
                    )}

                    {/* Student Actions */}
                    {!isLandlord && viewing.status === 'pending' && (
                      <Button
                        variant="outline"
                        onClick={() => handleCancelViewing(viewing.id)}
                      >
                        Cancel Request
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Schedule Viewing Dialog */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Viewing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Date and Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Notes for Student (optional)</Label>
                <Textarea
                  placeholder="Add any instructions or notes..."
                  value={landlordNotes}
                  onChange={(e) => setLandlordNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleScheduleViewing} disabled={!scheduledDate || updating}>
                {updating ? "Scheduling..." : "Confirm Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Accept Offer Confirmation Dialog */}
        <AlertDialog open={confirmOfferDialog.open} onOpenChange={(open) => setConfirmOfferDialog({ open, request: open ? confirmOfferDialog.request : null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Accept this offer?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be assigned to this room and all other pending and approved requests will be automatically cancelled. You can only have one active room.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAcceptOffer} disabled={acceptingOffer}>
                {acceptingOffer ? "Accepting..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Assign Different Room Dialog */}
        <Dialog open={assignRoomDialog.open} onOpenChange={(open) => { if (!open) setAssignRoomDialog({ open: false, request: null }); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign a Different Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {assignRoomDialog.request?.preferred_room_number && (
                <p className="text-sm text-muted-foreground">
                  Student preferred: <strong>{assignRoomDialog.request.preferred_room_number}</strong>
                </p>
              )}
              <div>
                <Label>Select Room</Label>
                <RadioGroup value={selectedAssignRoomId} onValueChange={setSelectedAssignRoomId} className="mt-2 space-y-2">
                  {availableRooms.map((room) => (
                    <div key={room.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                      <RadioGroupItem value={room.id} id={`room-${room.id}`} />
                      <Label htmlFor={`room-${room.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{room.room_number}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({room.current_occupants}/{room.capacity} occupied)
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {availableRooms.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">No available rooms found.</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignRoomDialog({ open: false, request: null })}>
                Cancel
              </Button>
              <Button
                onClick={() => assignRoomDialog.request && handleAcceptRental(assignRoomDialog.request, selectedAssignRoomId)}
                disabled={!selectedAssignRoomId || updating}
              >
                {updating ? "Sending..." : "Send Offer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
