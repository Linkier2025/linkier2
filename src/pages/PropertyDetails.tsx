import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Users, Star, Phone, Mail, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const mockProperty = {
  id: 1,
  title: "Cozy Student Apartment",
  rent: 4500,
  location: "Mount Pleasant, Harare",
  university: "University of Zimbabwe",
  rooms: 2,
  gender: "Mixed",
  rating: 4.5,
  description: "A beautiful and spacious apartment perfect for students. Located just 10 minutes walk from UCT campus. Features modern amenities and a secure environment.",
  images: ["/placeholder.svg", "/placeholder.svg", "/placeholder.svg"],
  amenities: ["WiFi", "Parking", "Security", "Laundry", "Kitchen", "Study Area"],
  landlord: {
    name: "Sarah Johnson",
    phone: "+27 21 555 0123",
    email: "sarah.johnson@example.com",
    rating: 4.8
  },
  reviews: [
    { id: 1, student: "Mike T.", rating: 5, comment: "Great place, very clean and safe!" },
    { id: 2, student: "Anna K.", rating: 4, comment: "Good location, friendly landlord." }
  ]
};

export default function PropertyDetails() {
  const { id } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);

  const handleRequestToRent = () => {
    toast({
      title: "Request sent!",
      description: "Your rental request has been sent to the landlord.",
    });
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    toast({
      title: isFavorite ? "Removed from favorites" : "Added to favorites",
      description: isFavorite ? "Property removed from your favorites." : "Property added to your favorites.",
    });
  };

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
                src={mockProperty.images[currentImageIndex]}
                alt={mockProperty.title}
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
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {mockProperty.images.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Info */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{mockProperty.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {mockProperty.location}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  ${mockProperty.rent.toLocaleString()} USD/month
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{mockProperty.rating}</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{mockProperty.rooms} rooms available</span>
              </div>
              <div>
                <span className="font-medium">Gender: </span>
                {mockProperty.gender}
              </div>
              <div>
                <span className="font-medium">University: </span>
                {mockProperty.university}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {mockProperty.amenities.map((amenity) => (
                  <Badge key={amenity} variant="secondary">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground">{mockProperty.description}</p>
            </div>
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
                <h4 className="font-medium">{mockProperty.landlord.name}</h4>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{mockProperty.landlord.rating} landlord rating</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <a href={`tel:${mockProperty.landlord.phone}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
              </a>
              <a href={`mailto:${mockProperty.landlord.email}`}>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Student Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockProperty.reviews.map((review) => (
              <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{review.student}</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="sticky bottom-4">
          <Button onClick={handleRequestToRent} size="lg" className="w-full shadow-lg">
            Request to Rent This Property
          </Button>
        </div>
      </div>
    </div>
  );
}