import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Clock, MapPin, Home, Mail, Phone, GraduationCap, User, MessageSquare, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  landlord_response: string | null;
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
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<ViewingRequest | null>(null);
  const [selectedRental, setSelectedRental] = useState<RentalRequest | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [landlordNotes, setLandlordNotes] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [updating, setUpdating] = useState(false);

  const isLandlord = profile?.user_type === 'landlord';

  useEffect(() => {
    if (user) {
      fetchAllRequests();
    }
  }, [user, isLandlord]);

  const fetchAllRequests = async () => {
    setLoading(true);
    await Promise.all([fetchViewings(), fetchRentalRequests()]);
    setLoading(false);
  };

  const fetchViewings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('property_viewings')
        .select(`
          *,
          property:properties(title, location, rent_amount, images)
        `)
        .order('requested_at', { ascending: false });

      if (isLandlord) {
        query = query.eq('landlord_id', user.id);
      } else {
        query = query.eq('student_id', user.id);
      }

      const { data: viewingsData, error } = await query;
      if (error) throw error;

      // Fetch student profiles
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

  const fetchRentalRequests = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('rental_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (isLandlord) {
        query = query.eq('landlord_id', user.id);
      } else {
        query = query.eq('student_id', user.id);
      }

      const { data: requestsData, error } = await query;
      if (error) throw error;

      // Fetch property and student details
      const requestsWithDetails = await Promise.all(
        (requestsData || []).map(async (request) => {
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

          return {
            ...request,
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
      fetchViewings();
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
      fetchViewings();
    } catch (error) {
      console.error('Error:', error);
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
      fetchViewings();
    } catch (error) {
      console.error('Error:', error);
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
      fetchViewings();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Failed to cancel.", variant: "destructive" });
    }
  };

  const handleApproveRental = async () => {
    if (!selectedRental) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ 
          status: 'approved',
          landlord_response: responseMessage || 'Your rental request has been approved!'
        })
        .eq('id', selectedRental.id);

      if (error) throw error;

      toast({
        title: "Request Approved",
        description: "You can now create a rental agreement.",
      });
      setApproveDialogOpen(false);
      setSelectedRental(null);
      setResponseMessage("");
      fetchRentalRequests();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Failed to approve.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeclineRental = async (request: RentalRequest) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ 
          status: 'rejected',
          landlord_response: 'Your rental request has been declined.'
        })
        .eq('id', request.id);

      if (error) throw error;

      toast({ title: "Request declined" });
      fetchRentalRequests();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Failed to decline.", variant: "destructive" });
    }
  };

  const handleCancelRental = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({ title: "Request cancelled" });
      fetchRentalRequests();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "Failed to cancel.", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      scheduled: "default",
      completed: "outline",
      cancelled: "destructive",
      approved: "default",
      rejected: "destructive"
    };
    const labels: Record<string, string> = {
      pending: "Pending",
      scheduled: "Scheduled",
      completed: "Completed",
      cancelled: "Cancelled",
      approved: "Approved",
      rejected: "Declined"
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
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={isLandlord ? "/landlord-dashboard" : "/student-dashboard"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {isLandlord ? "Property Requests" : "My Requests"}
          </h1>
        </div>

        <Tabs defaultValue="viewing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="viewing" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Viewing ({viewings.length})
            </TabsTrigger>
            <TabsTrigger value="rental" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Rental ({rentalRequests.length})
            </TabsTrigger>
          </TabsList>

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
                    {/* Student Info for Landlords */}
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
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium mb-1">Landlord's Notes</p>
                        <p className="text-sm text-muted-foreground">{viewing.landlord_notes}</p>
                      </div>
                    )}

                    {isLandlord && viewing.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedViewing(viewing);
                            setScheduleDialogOpen(true);
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeclineViewing(viewing.id)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {isLandlord && viewing.status === 'scheduled' && (
                      <Button size="sm" onClick={() => handleMarkCompleted(viewing.id)}>
                        Mark as Completed
                      </Button>
                    )}

                    {!isLandlord && viewing.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleCancelViewing(viewing.id)}>
                        Cancel Request
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Rental Requests Tab */}
          <TabsContent value="rental" className="space-y-4 mt-4">
            {rentalRequests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No rental requests</h3>
                  <p className="text-muted-foreground">
                    {isLandlord ? "No rental requests received yet." : "You haven't submitted any rental requests yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              rentalRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{request.property.title}</CardTitle>
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {request.property.location}
                        </div>
                        {request.property.rent_amount > 0 && (
                          <p className="text-sm font-semibold mt-1">
                            R{request.property.rent_amount}/month
                          </p>
                        )}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Student Info for Landlords */}
                    {isLandlord && <StudentInfoCard student={request.student} />}

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Requested: {format(new Date(request.requested_at), "PPP")}
                    </div>

                    {request.student_message && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium mb-1">
                          <MessageSquare className="h-4 w-4" />
                          {isLandlord ? "Student's Message" : "Your Message"}
                        </div>
                        <p className="text-sm text-muted-foreground">{request.student_message}</p>
                      </div>
                    )}

                    {request.landlord_response && request.status !== 'pending' && (
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium mb-1">Landlord's Response</p>
                        <p className="text-sm text-muted-foreground">{request.landlord_response}</p>
                      </div>
                    )}

                    {isLandlord && request.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRental(request);
                            setApproveDialogOpen(true);
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeclineRental(request)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {!isLandlord && request.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleCancelRental(request.id)}>
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
                <Label htmlFor="scheduled-date">Date and Time</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="landlord-notes">Notes (optional)</Label>
                <Textarea
                  id="landlord-notes"
                  placeholder="Add any additional information..."
                  value={landlordNotes}
                  onChange={(e) => setLandlordNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleScheduleViewing} disabled={!scheduledDate || updating}>
                {updating ? "Scheduling..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Approve Rental Dialog */}
        <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Rental Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Approving request from <strong>{selectedRental?.student?.first_name} {selectedRental?.student?.surname}</strong> for <strong>{selectedRental?.property.title}</strong>.
              </p>
              <div>
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="e.g., Welcome! Please contact me to arrange move-in..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApproveRental} disabled={updating}>
                {updating ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
