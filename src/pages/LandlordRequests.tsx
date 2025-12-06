import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Home, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  GraduationCap,
  Check,
  X,
  MessageSquare
} from "lucide-react";

interface RentalRequest {
  id: string;
  property_id: string;
  student_id: string;
  status: string;
  requested_at: string;
  student_message: string | null;
  landlord_response: string | null;
  property: {
    id: string;
    title: string;
    location: string;
    rent_amount: number;
    images: string[] | null;
  };
  student: {
    first_name: string | null;
    surname: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
    university: string | null;
    year_of_study: string | null;
    gender: string | null;
  } | null;
}

const LandlordRequests = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  const fetchRequests = async () => {
    try {
      const { data: requestsData, error } = await supabase
        .from("rental_requests")
        .select("*")
        .eq("landlord_id", user?.id)
        .order("requested_at", { ascending: false });

      if (error) throw error;

      // Fetch property and student details for each request
      const requestsWithDetails = await Promise.all(
        (requestsData || []).map(async (request) => {
          // Fetch property
          const { data: propertyData } = await supabase
            .from("properties")
            .select("id, title, location, rent_amount, images")
            .eq("id", request.property_id)
            .maybeSingle();

          // Fetch student profile
          const { data: studentData } = await supabase
            .from("profiles")
            .select("first_name, surname, email, phone, avatar_url, university, year_of_study, gender")
            .eq("user_id", request.student_id)
            .maybeSingle();

          return {
            ...request,
            property: propertyData || {
              id: request.property_id,
              title: "Unknown Property",
              location: "Unknown",
              rent_amount: 0,
              images: null,
            },
            student: studentData,
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load rental requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (request: RentalRequest) => {
    setSelectedRequest(request);
    setResponseMessage("");
    setResponseDialogOpen(true);
  };

  const handleReject = async (request: RentalRequest) => {
    try {
      const { error } = await supabase
        .from("rental_requests")
        .update({ 
          status: "rejected",
          landlord_response: "Your rental request has been declined."
        })
        .eq("id", request.id);

      if (error) throw error;

      toast({
        title: "Request Declined",
        description: "The rental request has been declined.",
      });

      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to decline request",
        variant: "destructive",
      });
    }
  };

  const handleApproveConfirm = async () => {
    if (!selectedRequest) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("rental_requests")
        .update({ 
          status: "approved",
          landlord_response: responseMessage || "Your rental request has been approved!"
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      toast({
        title: "Request Approved",
        description: "The rental request has been approved. You can now create a rental agreement.",
      });

      setResponseDialogOpen(false);
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-500 text-white">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Declined</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStudentInitials = (student: RentalRequest["student"]) => {
    if (!student) return "?";
    const first = student.first_name?.[0] || "";
    const last = student.surname?.[0] || "";
    return (first + last).toUpperCase() || "?";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/landlord-dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-6">Rental Requests</h1>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No rental requests yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{request.property.title}</CardTitle>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {request.property.location}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Student Info */}
                  <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={request.student?.avatar_url || undefined} />
                      <AvatarFallback>{getStudentInitials(request.student)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold">
                        {request.student?.first_name} {request.student?.surname}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {request.student?.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {request.student.email}
                          </div>
                        )}
                        {request.student?.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {request.student.phone}
                          </div>
                        )}
                        {request.student?.university && (
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" />
                            {request.student.university}
                            {request.student.year_of_study && ` - ${request.student.year_of_study}`}
                          </div>
                        )}
                        {request.student?.gender && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {request.student.gender}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Student Message */}
                  {request.student_message && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium mb-1">
                        <MessageSquare className="h-4 w-4" />
                        Student's Message
                      </div>
                      <p className="text-sm text-muted-foreground">{request.student_message}</p>
                    </div>
                  )}

                  {/* Request Details */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Requested: {new Date(request.requested_at).toLocaleDateString()}
                    </div>
                    <div className="font-semibold">
                      R{request.property.rent_amount}/month
                    </div>
                  </div>

                  {/* Landlord Response */}
                  {request.landlord_response && request.status !== "pending" && (
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="text-sm font-medium mb-1">Your Response</div>
                      <p className="text-sm text-muted-foreground">{request.landlord_response}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {request.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleApprove(request)}
                        className="flex-1"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleReject(request)}
                        className="flex-1"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approve Dialog */}
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Rental Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You're about to approve the rental request from{" "}
                <strong>
                  {selectedRequest?.student?.first_name} {selectedRequest?.student?.surname}
                </strong>{" "}
                for <strong>{selectedRequest?.property.title}</strong>.
              </p>
              <div>
                <label className="text-sm font-medium">
                  Add a message (optional)
                </label>
                <Textarea
                  placeholder="e.g., Welcome! Please contact me to arrange move-in details..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setResponseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleApproveConfirm} disabled={submitting}>
                {submitting ? "Approving..." : "Confirm Approval"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LandlordRequests;
