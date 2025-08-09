import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, MapPin, Users, Heart, Star } from "lucide-react";
import { Link } from "react-router-dom";

const mockProperties = [
  {
    id: 1,
    title: "Cozy Student Apartment",
    rent: 4500,
    location: "Mount Pleasant, Harare",
    university: "University of Zimbabwe",
    rooms: 2,
    gender: "Mixed",
    rating: 4.5,
    image: "/placeholder.svg",
    amenities: ["WiFi", "Parking", "Security"],
    landlord: "Sarah Johnson"
  },
  {
    id: 2,
    title: "Modern Studio Near Campus",
    rent: 3800,
    location: "Avondale, Harare",
    university: "University of Zimbabwe",
    rooms: 1,
    gender: "Girls",
    rating: 4.2,
    image: "/placeholder.svg",
    amenities: ["WiFi", "Laundry", "Kitchen"],
    landlord: "Mike Chen"
  },
  {
    id: 3,
    title: "Shared House with Garden",
    rent: 3200,
    location: "Belvedere, Harare",
    university: "University of Zimbabwe",
    rooms: 4,
    gender: "Boys",
    rating: 4.7,
    image: "/placeholder.svg",
    amenities: ["WiFi", "Garden", "Parking"],
    landlord: "Emma Davis"
  }
];

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    university: "",
    minRent: "",
    maxRent: "",
    gender: "",
    rooms: ""
  });
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (propertyId: number) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const filteredProperties = mockProperties.filter(property => {
    return property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           property.location.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Find Properties</h1>
          <Link to="/student-dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by location or property name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Select value={filters.university} onValueChange={(value) => setFilters({...filters, university: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="University" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uz">University of Zimbabwe</SelectItem>
                  <SelectItem value="nust">National University of Science and Technology</SelectItem>
                  <SelectItem value="msu">Midlands State University</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Min Rent"
                value={filters.minRent}
                onChange={(e) => setFilters({...filters, minRent: e.target.value})}
                type="number"
              />

              <Input
                placeholder="Max Rent"
                value={filters.maxRent}
                onChange={(e) => setFilters({...filters, maxRent: e.target.value})}
                type="number"
              />

              <Select value={filters.gender} onValueChange={(value) => setFilters({...filters, gender: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boys">Boys</SelectItem>
                  <SelectItem value="girls">Girls</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.rooms} onValueChange={(value) => setFilters({...filters, rooms: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Room</SelectItem>
                  <SelectItem value="2">2 Rooms</SelectItem>
                  <SelectItem value="3">3 Rooms</SelectItem>
                  <SelectItem value="4">4+ Rooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                  onClick={() => toggleFavorite(property.id)}
                >
                  <Heart 
                    className={`h-4 w-4 ${favorites.includes(property.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                  />
                </Button>
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{property.title}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{property.rating}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {property.location}
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  {property.rooms} rooms • {property.gender}
                </div>

                <div className="flex flex-wrap gap-1">
                  {property.amenities.slice(0, 3).map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xl font-bold text-primary">
                    R{property.rent.toLocaleString()}/month
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link to={`/property/${property.id}`} className="flex-1">
                    <Button className="w-full" variant="outline">
                      View Details
                    </Button>
                  </Link>
                  <Button className="flex-1">
                    Request to Rent
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}