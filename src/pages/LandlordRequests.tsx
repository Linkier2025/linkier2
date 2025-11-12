import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Home, Calendar, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface RentalRequest {
  id: string;
  property_id: string;
  student_id: string;
  status: string;
  requested_at: string;
  student_message: string | null;
  landlord_response: string | null;
  property: {
    title: string;
    location: string;
  };
  student?: {
    first_name: string;
    surname: string;
    phone: string;
    email: string;
  };
}

export default function LandlordRequests() {
  const { user } = useAuth();
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [landlordResponse, setLandlordResponse] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchRentalRequests();
  }, [user]);

  const fetchRentalRequests = async () => {
    if (!user) return;

    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('rental_requests')
        .select('*')
        .eq('landlord_id', user.id)
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch property details
      const propertyIds = [...new Set(requestsData?.map(r => r.property_id) || [])];
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, location')
        .in('id', propertyIds);

      // Fetch student profiles
      const studentIds = [...new Set(requestsData?.map(r => r.student_id) || [])];
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('user_id, first_name, surname, phone, email')
        .in('user_id', studentIds);

      const requestsWithDetails = requestsData?.map(request => ({
        ...request,
        property: propertiesData?.find(p => p.id === request.property_id) || { title: '', location: '' },
        student: studentsData?.find(s => s.user_id === request.student_id)
      })) || [];

      setRentalRequests(requestsWithDetails);
    } catch (error) {
      console.error('Error fetching rental requests:', error);
      toast({
        title: "Error",
        description: "Failed to load rental requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ 
          status: 'approved',
          landlord_response: landlordResponse || null 
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request approved",
        description: "The student has been notified of your decision.",
      });
      setResponseDialogOpen(false);
      setSelectedRequest(null);
      setLandlordResponse("");
      fetchRentalRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive"
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ 
          status: 'rejected',
          landlord_response: landlordResponse || null 
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request rejected",
        description: "The student has been notified of your decision.",
      });
      setResponseDialogOpen(false);
      setSelectedRequest(null);
      setLandlordResponse("");
      fetchRentalRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      cancelled: "outline"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
          <Link to="/landlord-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Rental Requests</h1>
        </div>

        {rentalRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rental requests</h3>
              <p className="text-muted-foreground">
                You haven't received any rental requests yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {rentalRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{request.property.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {request.property.location}
                      </div>
                      {request.student && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">
                            {request.student.first_name} {request.student.surname}
                          </p>
                          <p className="text-muted-foreground">{request.student.email}</p>
                          {request.student.phone && (
                            <p className="text-muted-foreground">{request.student.phone}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Requested: {format(new Date(request.requested_at), "PPP")}
                  </div>

                  {request.student_message && (
                    <div>
                      <p className="text-sm font-medium mb-1">Student's message:</p>
                      <p className="text-sm text-muted-foreground">{request.student_message}</p>
                    </div>
                  )}

                  {request.landlord_response && (
                    <div>
                      <p className="text-sm font-medium mb-1">Your response:</p>
                      <p className="text-sm text-muted-foreground">{request.landlord_response}</p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setResponseDialogOpen(true);
                        }}
                      >
                        Respond to Request
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Response Dialog */}
        <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Respond to Rental Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="landlord-response">Message to Student (optional)</Label>
                <Textarea
                  id="landlord-response"
                  placeholder="Add a message for the student..."
                  value={landlordResponse}
                  onChange={(e) => setLandlordResponse(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => selectedRequest && handleApproveRequest(selectedRequest.id)} 
                  className="flex-1"
                  disabled={updating}
                >
                  Approve Request
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => selectedRequest && handleRejectRequest(selectedRequest.id)} 
                  className="flex-1"
                  disabled={updating}
                >
                  Reject Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
