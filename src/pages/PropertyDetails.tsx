import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Users, Star, Phone, Mail, Heart, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

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
  const [loading, setLoading] = useState(true);
  const [viewingDialogOpen, setViewingDialogOpen] = useState(false);
  const [viewingMessage, setViewingMessage] = useState("");
  const [submittingViewing, setSubmittingViewing] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propertyError) throw propertyError;

        // Try to fetch landlord profile but don't fail the whole page if not accessible
        const { data: landlordData, error: landlordError } = await supabase
          .from('profiles')
          .select('first_name, surname, phone, email')
          .eq('user_id', propertyData.landlord_id)
          .maybeSingle();

        if (landlordError) {
          console.warn('Landlord profile not accessible due to RLS or missing data:', landlordError);
        }

        setProperty({
          ...propertyData,
          landlord: landlordData ?? { first_name: '', surname: '', phone: '', email: '' }
        });
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

    if (id) {
      fetchProperty();
    }
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

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite ? "Property removed from your favorites." : "Property added to your favorites.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
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
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
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
                className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                onClick={toggleFavorite}
              >
                <Heart 
                  className={`h-5 w-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                />
              </Button>
              
              {/* Image navigation dots */}
              {displayImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {displayImages.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
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
                <span>{property.rooms} rooms available</span>
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
            </div>
            
            <div className="flex gap-4">
              {property.landlord.phone && (
                <a href={`tel:${property.landlord.phone}`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                </a>
              )}
              {property.landlord.email && (
                <a href={`mailto:${property.landlord.email}`}>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="sticky bottom-4">
          <Dialog open={viewingDialogOpen} onOpenChange={setViewingDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="w-full shadow-lg">
                <Calendar className="mr-2 h-5 w-5" />
                Request Property Viewing
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
        </div>
      </div>
    </div>
  );
}