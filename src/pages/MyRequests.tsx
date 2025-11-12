import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle, Clock, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RentalRequest {
  id: string;
  property_id: string;
  status: string;
  requested_at: string;
  student_message: string | null;
  landlord_response: string | null;
  property: {
    title: string;
    location: string;
  };
}

export default function MyRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('rental_requests')
        .select('*')
        .eq('student_id', user.id)
        .order('requested_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Fetch property details
      const propertyIds = [...new Set(requestsData?.map(r => r.property_id) || [])];
      const { data: propertiesData } = await supabase
        .from('properties')
        .select('id, title, location')
        .in('id', propertyIds);

      const requestsWithProperties = requestsData?.map(request => ({
        ...request,
        property: propertiesData?.find(p => p.id === request.property_id) || { title: '', location: '' }
      })) || [];

      setRequests(requestsWithProperties);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load rental requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('rental_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your rental request has been cancelled.",
      });
      fetchRequests();
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request.",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "approved":
        return "default";
      case "rejected":
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
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
          <Link to="/student-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">My Rental Requests</h1>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No rental requests yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by browsing properties and requesting to rent ones you like.
              </p>
              <Link to="/properties">
                <Button>Browse Properties</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
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
                    <Badge variant={getStatusVariant(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon(request.status)}
                    <span>Requested on {format(new Date(request.requested_at), "PPP")}</span>
                  </div>

                  {request.student_message && (
                    <div>
                      <p className="text-sm font-medium mb-1">Your message:</p>
                      <p className="text-sm text-muted-foreground">{request.student_message}</p>
                    </div>
                  )}

                  {request.status === "approved" && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-1">
                        Your request has been approved!
                      </p>
                      {request.landlord_response && (
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {request.landlord_response}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "rejected" && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-1">
                        Request was not approved
                      </p>
                      {request.landlord_response && (
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {request.landlord_response}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "pending" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Cancel Request
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to cancel this rental request? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>No, keep it</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCancelRequest(request.id)}>
                            Yes, cancel
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
