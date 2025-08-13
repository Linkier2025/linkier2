import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, MapPin, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RentalRequest {
  id: number;
  propertyTitle: string;
  propertyLocation: string;
  rent: number;
  requestDate: string;
  status: 'pending' | 'approved' | 'rejected';
  landlordName: string;
}

const mockRequests: RentalRequest[] = [
  {
    id: 1,
    propertyTitle: "Cozy Student Apartment",
    propertyLocation: "Mount Pleasant, Harare",
    rent: 4500,
    requestDate: "2024-01-15",
    status: 'pending',
    landlordName: "Sarah Johnson"
  },
  {
    id: 2,
    propertyTitle: "Modern Shared Housing",
    propertyLocation: "Avondale, Harare",
    rent: 3200,
    requestDate: "2024-01-12",
    status: 'approved',
    landlordName: "Mike Peterson"
  },
  {
    id: 3,
    propertyTitle: "Student Residence",
    propertyLocation: "Newlands, Harare",
    rent: 2800,
    requestDate: "2024-01-10",
    status: 'rejected',
    landlordName: "Lisa Wong"
  }
];

export default function MyRequests() {
  const [requests, setRequests] = useState<RentalRequest[]>(mockRequests);

  const handleCancelRequest = (requestId: number) => {
    setRequests(prevRequests => prevRequests.filter(request => request.id !== requestId));
    toast({
      title: "Request cancelled",
      description: "Your rental request has been cancelled successfully.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'default';
    }
  };

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
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No rental requests yet.</p>
              <Link to="/properties">
                <Button className="mt-4">Browse Properties</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{request.propertyTitle}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {request.propertyLocation}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(request.status)} className="flex items-center gap-1">
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Rent: </span>
                      ${request.rent.toLocaleString()} USD/month
                    </div>
                    <div>
                      <span className="font-medium">Landlord: </span>
                      {request.landlordName}
                    </div>
                    <div>
                      <span className="font-medium">Request Date: </span>
                      {new Date(request.requestDate).toLocaleDateString()}
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex justify-end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                            <X className="h-4 w-4 mr-2" />
                            Cancel Request
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Rental Request</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel your request for "{request.propertyTitle}"? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep Request</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleCancelRequest(request.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel Request
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}

                  {request.status === 'approved' && (
                    <div className="bg-secondary/50 p-3 rounded-lg">
                      <p className="text-sm text-foreground">
                        Great news! Your request has been approved. The landlord will contact you soon to discuss the next steps.
                      </p>
                    </div>
                  )}

                  {request.status === 'rejected' && (
                    <div className="bg-destructive/10 p-3 rounded-lg">
                      <p className="text-sm text-foreground">
                        Unfortunately, your request was not approved. You can browse other properties or try again later.
                      </p>
                    </div>
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