import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Users, Star, Heart, Calendar, Home, MessageCircle, DoorOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { ContactOptionsSheet } from "@/components/ContactOptionsSheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface RoomInfo {
  id: string;
  room_number: string;
  capacity: number;
  current_occupants: number;
}

interface PropertyData {
  id: string;
  title: string;
  rent_amount: number;
  location: string;
  university: string;
  rooms: number;
  gender_preference: string;
  rating: number;
  description: string;
  images: string[];
  amenities: string[];
  house_number: string;
  boarding_house_name: string;
  landlord_id: string;
  landlord: {
    first_name: string;
    surname: string;
    phone: string;
    email: string;
  };
}

export default function PropertyDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingDialogOpen, setViewingDialogOpen] = useState(false);
  const [viewingMessage, setViewingMessage] = useState("");
  const [submittingViewing, setSubmittingViewing] = useState(false);
  const [rentalDialogOpen, setRentalDialogOpen] = useState(false);
  const [rentalMessage, setRentalMessage] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [submittingRental, setSubmittingRental] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch property
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propertyError) throw propertyError;

        // Fetch landlord profile
        const { data: landlordData } = await supabase
          .from('profiles')
          .select('first_name, surname, phone, email')
          .eq('user_id', propertyData.landlord_id)
          .maybeSingle();

        setProperty({
          ...propertyData,
          landlord: landlordData ?? { first_name: '', surname: '', phone: '', email: '' }
        });

        // Fetch rooms with occupancy
        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('id, room_number, capacity')
          .eq('property_id', id!)
          .order('room_number');

        if (roomsError) throw roomsError;

        // Get occupancy counts for each room
        const roomsWithOccupancy: RoomInfo[] = [];
        for (const room of roomsData || []) {
          const { count } = await supabase
            .from('room_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .in('status', ['active', 'reserved']);

          roomsWithOccupancy.push({
            id: room.id,
            room_number: room.room_number,
            capacity: room.capacity,
            current_occupants: count || 0,
          });
        }

        setRooms(roomsWithOccupancy);
      } catch (error) {
        console.error('Error fetching property:', error);
        toast({
          title: "Error",
          description: "Failed to load property details.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  const handleRequestViewing = async () => {
    if (!user || !property) return;
    
    setSubmittingViewing(true);
    try {
      const { error } = await supabase
        .from('property_viewings')
        .insert({
          property_id: id,
          student_id: user.id,
          landlord_id: property.landlord_id,
          student_message: viewingMessage,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Viewing request sent!",
        description: "The landlord will review your request and schedule a viewing.",
      });
      setViewingDialogOpen(false);
      setViewingMessage("");
    } catch (error) {
      console.error('Error submitting viewing request:', error);
      toast({
        title: "Error",
        description: "Failed to send viewing request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingViewing(false);
    }
  };

  const handleRequestRental = async () => {
    if (!user || !property || !selectedRoomId) return;
    
    setSubmittingRental(true);
    try {
      const { error } = await supabase
        .from('rental_requests')
        .insert({
          property_id: id,
          student_id: user.id,
          landlord_id: property.landlord_id,
          student_message: rentalMessage,
          room_id: selectedRoomId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Room request sent!",
        description: "The landlord will review your request and get back to you.",
      });
      setRentalDialogOpen(false);
      setRentalMessage("");
      setSelectedRoomId("");
    } catch (error) {
      console.error('Error submitting rental request:', error);
      toast({
        title: "Error",
        description: "Failed to send room request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmittingRental(false);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite ? "Property removed from your favorites." : "Property added to your favorites.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold">Property not found</h1>
          <Link to="/properties">
            <Button className="mt-4">Back to Properties</Button>
          </Link>
        </div>
      </div>
    );
  }

  const displayImages = property.images && property.images.length > 0 
    ? property.images 
    : ["/placeholder.svg"];

  const availableRooms = rooms.filter(r => r.current_occupants < r.capacity);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Property Details</h1>
        </div>

        {/* Image Gallery */}
        <Card>
          <CardContent className="p-0">
            <div className="relative">
              <img
                src={displayImages[currentImageIndex]}
                alt={property.title}
                className="w-full h-64 md:h-96 object-cover rounded-t-lg"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                onClick={toggleFavorite}
              >
                <Heart 
                  className={`h-5 w-5 ${isFavorite ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} 
                />
              </Button>
              
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {displayImages.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-background' : 'bg-background/50'}`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{property.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </div>
                {property.house_number && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {property.house_number}
                  </div>
                )}
                {property.boarding_house_name && (
                  <div className="text-sm text-muted-foreground">
                    {property.boarding_house_name}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${property.rent_amount.toLocaleString()} USD/month
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{property.rating}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{property.rooms} rooms</span>
              </div>
              <div>
                <span className="font-medium">Gender: </span>
                {property.gender_preference || "Not specified"}
              </div>
              <div>
                <span className="font-medium">University: </span>
                {property.university || "Not specified"}
              </div>
            </div>

            {property.amenities && property.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {property.description && (
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">{property.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Rooms */}
        {rooms.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Available Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {rooms.map((room) => {
                  const isFull = room.current_occupants >= room.capacity;
                  return (
                    <div
                      key={room.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isFull ? 'bg-muted/50 opacity-60' : 'bg-background'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <DoorOpen className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Room {room.room_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Capacity: {room.capacity} student{room.capacity > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={isFull ? "destructive" : "secondary"}>
                          {room.current_occupants}/{room.capacity} occupied
                        </Badge>
                        {isFull && (
                          <Badge variant="outline" className="text-destructive">Full</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Landlord Info */}
        <Card>
          <CardHeader>
            <CardTitle>Landlord Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">
                  {property.landlord.first_name} {property.landlord.surname}
                </h4>
              </div>
              <ContactOptionsSheet
                phone={property.landlord.phone}
                email={property.landlord.email}
                name={`${property.landlord.first_name} ${property.landlord.surname}`.trim() || "Landlord"}
                trigger={
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Contact Landlord
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="sticky bottom-4 flex gap-3">
          <Dialog open={viewingDialogOpen} onOpenChange={setViewingDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="flex-1">
                <Calendar className="mr-2 h-5 w-5" />
                Request Viewing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Property Viewing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Send a message to the landlord with your viewing request:
                  </p>
                  <Textarea
                    placeholder="Let the landlord know when you'd like to view the property..."
                    value={viewingMessage}
                    onChange={(e) => setViewingMessage(e.target.value)}
                    rows={4}
                  />
                </div>
                <Button 
                  onClick={handleRequestViewing} 
                  className="w-full"
                  disabled={submittingViewing}
                >
                  {submittingViewing ? "Sending..." : "Send Viewing Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={rentalDialogOpen} onOpenChange={setRentalDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="flex-1" disabled={availableRooms.length === 0}>
                <Home className="mr-2 h-5 w-5" />
                {availableRooms.length === 0 ? "No Rooms Available" : "Request Room"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {/* Room Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select a Room</Label>
                  <RadioGroup value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <div className="grid gap-2">
                      {availableRooms.map((room) => (
                        <div key={room.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value={room.id} id={`room-${room.id}`} />
                          <Label htmlFor={`room-${room.id}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Room {room.room_number}</span>
                              <Badge variant="secondary">
                                {room.current_occupants}/{room.capacity} occupied
                              </Badge>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Message (optional)</Label>
                  <Textarea
                    placeholder="Introduce yourself and let the landlord know why you'd like this room..."
                    value={rentalMessage}
                    onChange={(e) => setRentalMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleRequestRental} 
                  className="w-full"
                  disabled={submittingRental || !selectedRoomId}
                >
                  {submittingRental ? "Sending..." : "Send Room Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
