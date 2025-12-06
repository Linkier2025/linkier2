import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Building,
  Hash,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Rental {
  id: string;
  room_number: string | null;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  status: string;
  properties: {
    title: string;
    location: string;
    house_number: string | null;
    boarding_house_name: string | null;
    total_rooms: number | null;
    occupancy_rate: string | null;
    amenities: string[] | null;
  };
}

interface RentalRequest {
  id: string;
  property_id: string;
  student_message: string | null;
  status: string;
  landlord_response: string | null;
  created_at: string;
  property_title?: string;
  property_location?: string;
  property_rent?: number;
  property_image?: string | null;
}

export default function Rentals() {
  const { user } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRentals();
      fetchRentalRequests();
    }
  }, [user]);

  const fetchRentals = async () => {
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          *,
          properties (
            title,
            location,
            house_number,
            boarding_house_name,
            total_rooms,
            occupancy_rate,
            amenities
          )
        `)
        .eq('student_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load rentals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRentalRequests = async () => {
    try {
      const { data: requestsData, error: requestsError } = await supabase
        .from('rental_requests')
        .select('*')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;
      
      if (!requestsData || requestsData.length === 0) {
        setRentalRequests([]);
        return;
      }

      // Fetch property details for each request
      const propertyIds = [...new Set(requestsData.map(r => r.property_id))];
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, title, location, rent_amount, images')
        .in('id', propertyIds);

      if (propertiesError) throw propertiesError;

      const propertiesMap = new Map(propertiesData?.map(p => [p.id, p]) || []);

      const enrichedRequests: RentalRequest[] = requestsData.map(request => {
        const property = propertiesMap.get(request.property_id);
        return {
          ...request,
          property_title: property?.title || 'Unknown Property',
          property_location: property?.location || '',
          property_rent: property?.rent_amount || 0,
          property_image: property?.images?.[0] || null,
        };
      });

      setRentalRequests(enrichedRequests);
    } catch (error) {
      console.error('Error fetching rental requests:', error);
    }
  };

  const cancelRentalRequest = async (requestId: string) => {
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
      fetchRentalRequests();
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
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <p>Loading rentals...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Rentals</h1>
          <Link to="/student-dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Rental Requests Section */}
        {rentalRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Rental Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rentalRequests.map((request) => (
                <Card key={request.id} className="overflow-hidden">
                  <div className="h-32 bg-muted relative">
                    <img
                      src={request.property_image || "/placeholder.svg"}
                      alt={request.property_title}
                      className="w-full h-full object-cover"
                    />
                    <Badge 
                      className="absolute top-2 right-2"
                      variant={
                        request.status === 'pending' ? 'secondary' :
                        request.status === 'approved' ? 'default' :
                        request.status === 'rejected' ? 'destructive' : 'outline'
                      }
                    >
                      <span className="flex items-center gap-1">
                        {request.status === 'pending' && <Clock className="h-3 w-3" />}
                        {request.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                        {request.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">{request.property_title}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {request.property_location}
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium text-primary mt-1">
                        <DollarSign className="h-3 w-3" />
                        {request.property_rent}/month
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Requested: {new Date(request.created_at).toLocaleDateString()}
                    </div>

                    {request.student_message && (
                      <div className="text-sm bg-muted p-2 rounded">
                        <span className="text-muted-foreground">Your message:</span>
                        <p className="line-clamp-2">{request.student_message}</p>
                      </div>
                    )}

                    {request.landlord_response && (
                      <div className="text-sm bg-primary/5 p-2 rounded">
                        <span className="text-muted-foreground">Landlord response:</span>
                        <p>{request.landlord_response}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => cancelRentalRequest(request.id)}
                      >
                        Cancel Request
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Rentals Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Rentals</h2>
          
          {rentals.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Active Rentals</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have any active rental agreements at the moment.
                </p>
                <Link to="/properties">
                  <Button>Browse Properties</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {rentals.map((rental) => (
                <Card key={rental.id} className="overflow-hidden">
                  <CardHeader className="bg-primary/5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        {rental.properties.title}
                      </CardTitle>
                      <Badge 
                        variant={rental.status === "active" ? "default" : "secondary"}
                      >
                        {rental.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 p-6">
                    {/* Property Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg">Property Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {rental.properties.house_number && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">House:</span>
                            <span>{rental.properties.house_number}</span>
                          </div>
                        )}
                        {rental.room_number && (
                          <div className="flex items-center gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Room:</span>
                            <span>{rental.room_number}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Location:</span>
                          <span>{rental.properties.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Rent:</span>
                          <span className="font-semibold text-primary">
                            ${rental.monthly_rent}/month
                          </span>
                        </div>
                      </div>
                    </div>

                    {rental.properties.boarding_house_name && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h3 className="font-semibold">Boarding House: {rental.properties.boarding_house_name}</h3>
                          
                          {(rental.properties.total_rooms || rental.properties.occupancy_rate) && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              {rental.properties.total_rooms && (
                                <div>
                                  <span className="text-muted-foreground">Total Rooms:</span>
                                  <p className="font-medium">{rental.properties.total_rooms}</p>
                                </div>
                              )}
                              {rental.properties.occupancy_rate && (
                                <div>
                                  <span className="text-muted-foreground">Occupancy:</span>
                                  <p className="font-medium">{rental.properties.occupancy_rate}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {rental.properties.amenities && rental.properties.amenities.length > 0 && (
                            <div>
                              <p className="text-muted-foreground text-sm mb-2">Facilities:</p>
                              <div className="flex flex-wrap gap-1">
                                {rental.properties.amenities.map((facility) => (
                                  <Badge key={facility} variant="outline" className="text-xs">
                                    {facility}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Lease Information */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">Lease Period</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Start:</span>
                          <p className="font-medium">
                            {new Date(rental.lease_start).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">End:</span>
                          <p className="font-medium">
                            {new Date(rental.lease_end).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Link to="/messages" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Contact Landlord
                        </Button>
                      </Link>
                      <Link to="/rent-tracking" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View Payment History
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}