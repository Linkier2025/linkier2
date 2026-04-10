import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Users, Star, Heart, Calendar, Home, MessageCircle, DoorOpen, Check, GraduationCap, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { ContactOptionsSheet } from "@/components/ContactOptionsSheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getSpaceTypeLabel, getSpaceTypeIcon } from "@/lib/spaceConfig";

interface RoomInfo {
  id: string;
  room_number: string;
  type: string;
  capacity: number | null;
  current_occupants: number;
  renovation_status: string;
  gender_tag: string | null;
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
  const navigate = useNavigate();
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
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propertyError) throw propertyError;

        const { data: landlordData } = await supabase
          .from('profiles')
          .select('first_name, surname, phone, email')
          .eq('user_id', propertyData.landlord_id)
          .maybeSingle();

        setProperty({
          ...propertyData,
          landlord: landlordData ?? { first_name: '', surname: '', phone: '', email: '' }
        });

        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select('id, room_number, capacity, type, gender_tag, renovation_status')
          .eq('property_id', id!)
          .order('room_number');

        if (roomsError) throw roomsError;

        const roomsWithOccupancy: RoomInfo[] = [];
        for (const room of roomsData || []) {
          const roomType = (room as any).type || 'bedroom';
          let currentOccupants = 0;
          if (roomType === 'bedroom') {
            const { count } = await supabase
              .from('room_assignments')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .in('status', ['active', 'reserved']);
            currentOccupants = count || 0;
          }

          roomsWithOccupancy.push({
            id: room.id,
            room_number: room.room_number,
            type: roomType,
            capacity: room.capacity,
            current_occupants: currentOccupants,
            renovation_status: (room as any).renovation_status || 'available',
            gender_tag: (room as any).gender_tag || null,
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
      toast({ title: "Viewing request sent!", description: "The landlord will review your request and schedule a viewing." });
      setViewingDialogOpen(false);
      setViewingMessage("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to send viewing request.", variant: "destructive" });
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
          preferred_room_id: selectedRoomId,
          status: 'pending'
        } as any);
      if (error) throw error;
      toast({ title: "Room request sent!", description: "The landlord will review your request." });
      setRentalDialogOpen(false);
      setRentalMessage("");
      setSelectedRoomId("");
    } catch (error) {
      toast({ title: "Error", description: "Failed to send room request.", variant: "destructive" });
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
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto text-center pt-20">
          <h1 className="text-xl font-bold">Property not found</h1>
          <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const displayImages = property.images && property.images.length > 0 
    ? property.images 
    : ["/placeholder.svg"];

  const bedrooms = rooms.filter(r => r.type === 'bedroom');
  const sharedSpaces = rooms.filter(r => r.type !== 'bedroom');
  const availableRooms = bedrooms.filter(r => r.capacity && r.current_occupants < r.capacity && r.renovation_status !== 'under_renovation');

  const sharedSummary: Record<string, number> = {};
  sharedSpaces.forEach(s => {
    sharedSummary[s.type] = (sharedSummary[s.type] || 0) + 1;
  });

  const totalCapacity = bedrooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
  const totalOccupants = bedrooms.reduce((sum, r) => sum + r.current_occupants, 0);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Image Gallery - Full width on mobile */}
      <div className="relative">
        <img
          src={displayImages[currentImageIndex]}
          alt={property.title}
          className="w-full h-56 md:h-80 object-cover"
        />
        {/* Back button overlay */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {/* Favorite button */}
        <button
          onClick={toggleFavorite}
          className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
        </button>
        {/* Image counter */}
        {displayImages.length > 1 && (
          <>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm text-foreground text-xs px-2.5 py-1 rounded-full font-medium">
              {currentImageIndex + 1} / {displayImages.length}
            </div>
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 flex items-center justify-center"
              onClick={() => setCurrentImageIndex(i => i === 0 ? displayImages.length - 1 : i - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-background/70 flex items-center justify-center"
              onClick={() => setCurrentImageIndex(i => i === displayImages.length - 1 ? 0 : i + 1)}
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </button>
          </>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-5 pt-4">
        {/* Title + Price + Location */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-tight">{property.title}</h1>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="h-4 w-4 fill-warning text-warning" />
              <span className="text-sm font-medium">{property.rating || "–"}</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-primary mt-1">
            ${property.rent_amount.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground"> /month</span>
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{property.location}</span>
          </div>
        </div>

        {/* Key Details Row */}
        <div className="flex items-center gap-4 py-3 px-1 border-y border-border overflow-x-auto">
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{bedrooms.length}</span>
            <span className="text-muted-foreground">{bedrooms.length === 1 ? "bed" : "beds"}</span>
          </div>
          <div className="h-4 border-l border-border" />
          <div className="flex items-center gap-1.5 text-sm shrink-0">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{property.gender_preference || "Mixed"}</span>
          </div>
          {property.university && (
            <>
              <div className="h-4 border-l border-border" />
              <div className="flex items-center gap-1.5 text-sm shrink-0">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{property.university}</span>
              </div>
            </>
          )}
        </div>

        {/* Secondary address info */}
        {(property.house_number || property.boarding_house_name) && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {property.house_number && <p>{property.house_number}</p>}
            {property.boarding_house_name && <p>{property.boarding_house_name}</p>}
          </div>
        )}

        {/* Description */}
        {property.description && (
          <div>
            <h3 className="text-sm font-semibold mb-1.5">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{property.description}</p>
          </div>
        )}

        {/* Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Amenities</h3>
            <div className="flex flex-wrap gap-1.5">
              {property.amenities.map((amenity) => (
                <Badge key={amenity} variant="secondary" className="text-xs font-normal px-2.5 py-1">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bedrooms Summary */}
        {bedrooms.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DoorOpen className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Bedrooms</h3>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-lg">{bedrooms.length}</span>
                <span className="text-muted-foreground">
                  {availableRooms.length} available · {totalOccupants}/{totalCapacity} occupied
                </span>
              </div>
              {bedrooms.some(r => r.capacity && r.capacity > 1) && (
                <p className="text-xs text-muted-foreground mt-1">Shared rooms available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Facilities */}
        {Object.keys(sharedSummary).length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Facilities</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(sharedSummary).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/50">
                    <span className="text-lg">{getSpaceTypeIcon(type)}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{getSpaceTypeLabel(type)}</p>
                      {count > 1 && <p className="text-[10px] text-muted-foreground">×{count}</p>}
                    </div>
                    <Check className="h-3.5 w-3.5 text-green-500 ml-auto shrink-0" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Landlord Info */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Landlord</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {property.landlord.first_name} {property.landlord.surname}
                  </p>
                  <p className="text-xs text-muted-foreground">Property Owner</p>
                </div>
              </div>
              <ContactOptionsSheet
                phone={property.landlord.phone}
                email={property.landlord.email}
                name={`${property.landlord.first_name} ${property.landlord.surname}`.trim() || "Landlord"}
                trigger={
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Contact
                  </Button>
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky CTA Bar */}
      <div className="fixed bottom-20 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t">
        <div className="flex gap-3 max-w-4xl mx-auto p-3">
          <Dialog open={viewingDialogOpen} onOpenChange={setViewingDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="flex-1 min-w-0">
                <Calendar className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate text-sm">Request Viewing</span>
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
              <Button size="lg" className="flex-1 min-w-0" disabled={availableRooms.length === 0}>
                <Home className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate text-sm">{availableRooms.length === 0 ? "No Rooms Available" : "Request Bedroom"}</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Select a Room</Label>
                  <RadioGroup value={selectedRoomId} onValueChange={setSelectedRoomId}>
                    <div className="grid gap-2">
                      {availableRooms.map((room) => (
                        <div key={room.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value={room.id} id={`room-${room.id}`} />
                          <Label htmlFor={`room-${room.id}`} className="flex-1 cursor-pointer">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{room.room_number}</span>
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
