import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Users, Heart, Star, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Property {
  id: string;
  title: string;
  rent_amount: number;
  location: string;
  university: string | null;
  rooms: number;
  gender_preference: string | null;
  rating: number;
  images: string[] | null;
  amenities: string[] | null;
}

interface PropertyOccupancy {
  totalCapacity: number;
  totalOccupants: number;
  availableRooms: number;
  totalRooms: number;
  isFullyOccupied: boolean;
}

export default function Properties() {
  const [searchTerm, setSearchTerm] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [occupancyMap, setOccupancyMap] = useState<Record<string, PropertyOccupancy>>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    university: "",
    minRent: "",
    maxRent: "",
    gender: "",
    rooms: ""
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('status', 'available');

      if (error) throw error;
      setProperties(data || []);

      // Fetch occupancy for all properties
      const propertyIds = (data || []).map(p => p.id);
      if (propertyIds.length > 0) {
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('id, property_id, capacity, renovation_status')
          .in('property_id', propertyIds);

        const roomIds = (roomsData || []).map(r => r.id);
        let assignmentCounts: Record<string, number> = {};

        if (roomIds.length > 0) {
          const { data: assignments } = await supabase
            .from('room_assignments')
            .select('room_id')
            .in('room_id', roomIds)
            .in('status', ['active', 'reserved']);

          (assignments || []).forEach(a => {
            assignmentCounts[a.room_id] = (assignmentCounts[a.room_id] || 0) + 1;
          });
        }

        const occMap: Record<string, PropertyOccupancy> = {};
        propertyIds.forEach(pid => {
          const propRooms = (roomsData || []).filter(r => r.property_id === pid);
          const availableRooms = propRooms.filter(r => {
            if (r.renovation_status === 'under_renovation') return false;
            const occupants = assignmentCounts[r.id] || 0;
            return occupants < r.capacity;
          });

          const totalCapacity = propRooms.reduce((sum, r) => sum + r.capacity, 0);
          const totalOccupants = propRooms.reduce((sum, r) => sum + (assignmentCounts[r.id] || 0), 0);

          occMap[pid] = {
            totalCapacity,
            totalOccupants,
            availableRooms: availableRooms.length,
            totalRooms: propRooms.length,
            isFullyOccupied: availableRooms.length === 0 && propRooms.length > 0,
          };
        });
        setOccupancyMap(occMap);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (propertyId: string) => {
    setFavorites(prev => 
      prev.includes(propertyId) 
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
           property.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUniversity = !filters.university || property.university === filters.university;
    const matchesMinRent = !filters.minRent || property.rent_amount >= Number(filters.minRent);
    const matchesMaxRent = !filters.maxRent || property.rent_amount <= Number(filters.maxRent);
    const matchesGender = !filters.gender || property.gender_preference?.toLowerCase() === filters.gender.toLowerCase();
    const matchesRooms = !filters.rooms || property.rooms >= Number(filters.rooms);

    return matchesSearch && matchesUniversity && matchesMinRent && matchesMaxRent && matchesGender && matchesRooms;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <p>Loading properties...</p>
      </div>
    );
  }

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
                  <SelectItem value="University of Zimbabwe">University of Zimbabwe</SelectItem>
                  <SelectItem value="National University of Science and Technology">National University of Science and Technology</SelectItem>
                  <SelectItem value="Midlands State University">Midlands State University</SelectItem>
                  <SelectItem value="Harare Institute of Technology">Harare Institute of Technology</SelectItem>
                  <SelectItem value="Chinhoyi University of Technology">Chinhoyi University of Technology</SelectItem>
                  <SelectItem value="Great Zimbabwe University">Great Zimbabwe University</SelectItem>
                  <SelectItem value="Bindura University of Science Education">Bindura University of Science Education</SelectItem>
                  <SelectItem value="Lupane State University">Lupane State University</SelectItem>
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
        {filteredProperties.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No properties found. Try adjusting your filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => {
              const occ = occupancyMap[property.id];
              const isFullyOccupied = occ?.isFullyOccupied ?? false;

              return (
                <Card key={property.id} className={`overflow-hidden hover:shadow-lg transition-shadow ${isFullyOccupied ? 'opacity-75' : ''}`}>
                  <div className="relative">
                    <img
                      src={property.images?.[0] || "/placeholder.svg"}
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
                    {isFullyOccupied && (
                      <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Fully Occupied
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{property.title}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{property.rating || 0}</span>
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
                      {property.rooms} rooms • {property.gender_preference || 'Mixed'}
                      {occ && (
                        <Badge variant={isFullyOccupied ? "destructive" : "secondary"} className="ml-auto text-xs">
                          {occ.totalOccupants}/{occ.totalCapacity} occupied
                        </Badge>
                      )}
                    </div>

                    {property.amenities && property.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {property.amenities.slice(0, 3).map((amenity) => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-xl font-bold text-primary">
                        ${property.rent_amount.toLocaleString()} USD/month
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/property/${property.id}`} className="flex-1">
                        <Button className="w-full" variant="outline">
                          View Details
                        </Button>
                      </Link>
                      {isFullyOccupied ? (
                        <Button className="flex-1" disabled>
                          No Rooms Available
                        </Button>
                      ) : (
                        <Link to={`/property/${property.id}`} className="flex-1">
                          <Button className="w-full">
                            Request to Rent
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
