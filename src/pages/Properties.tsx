import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationSection } from "@/components/LocationSection";

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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    university: "",
    minRent: "",
    maxRent: "",
    gender: "",
    rooms: "",
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "available");

      if (error) throw error;
      setProperties(data || []);

      const propertyIds = (data || []).map((p) => p.id);
      if (propertyIds.length > 0) {
        const { data: roomsData } = await supabase
          .from("rooms")
          .select("id, property_id, capacity, renovation_status, type")
          .in("property_id", propertyIds);

        const roomIds = (roomsData || []).map((r) => r.id);
        let assignmentCounts: Record<string, number> = {};

        if (roomIds.length > 0) {
          const { data: assignments } = await supabase
            .from("room_assignments")
            .select("room_id")
            .in("room_id", roomIds)
            .in("status", ["active", "reserved"]);

          (assignments || []).forEach((a) => {
            assignmentCounts[a.room_id] = (assignmentCounts[a.room_id] || 0) + 1;
          });
        }

        const occMap: Record<string, PropertyOccupancy> = {};
        propertyIds.forEach((pid) => {
          const propRooms = (roomsData || []).filter((r) => r.property_id === pid);
          const propBedrooms = propRooms.filter((r: any) => (r.type || 'bedroom') === 'bedroom');
          const availableBedrooms = propBedrooms.filter((r) => {
            if (r.renovation_status === "under_renovation") return false;
            const occupants = assignmentCounts[r.id] || 0;
            return r.capacity ? occupants < r.capacity : false;
          });
          const totalCapacity = propBedrooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
          const totalOccupants = propBedrooms.reduce(
            (sum, r) => sum + (assignmentCounts[r.id] || 0),
            0
          );
          occMap[pid] = {
            totalCapacity,
            totalOccupants,
            availableRooms: availableBedrooms.length,
            totalRooms: propBedrooms.length,
            isFullyOccupied: availableBedrooms.length === 0 && propBedrooms.length > 0,
          };
        });
        setOccupancyMap(occMap);
      }
    } catch {
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
    setFavorites((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUniversity =
        !filters.university || property.university === filters.university;
      const matchesMinRent =
        !filters.minRent || property.rent_amount >= Number(filters.minRent);
      const matchesMaxRent =
        !filters.maxRent || property.rent_amount <= Number(filters.maxRent);
      const matchesGender =
        !filters.gender ||
        property.gender_preference?.toLowerCase() === filters.gender.toLowerCase();
      const matchesRooms =
        !filters.rooms || property.rooms >= Number(filters.rooms);
      return (
        matchesSearch &&
        matchesUniversity &&
        matchesMinRent &&
        matchesMaxRent &&
        matchesGender &&
        matchesRooms
      );
    });
  }, [properties, searchTerm, filters]);

  // Group by location
  const groupedByLocation = useMemo(() => {
    const groups: Record<string, Property[]> = {};
    filteredProperties.forEach((p) => {
      const loc = p.location || "Other";
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(p);
    });
    // Sort locations alphabetically
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProperties]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Explore</h1>
          <Link to="/student-dashboard">
            <Button variant="outline" size="sm">
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search location or property..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-full bg-muted border-0 text-sm"
            />
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapsible filters */}
        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1 pb-1">
            <Select
              value={filters.university}
              onValueChange={(value) => setFilters({ ...filters, university: value })}
            >
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="University" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="University of Zimbabwe">UZ</SelectItem>
                <SelectItem value="National University of Science and Technology">NUST</SelectItem>
                <SelectItem value="Midlands State University">MSU</SelectItem>
                <SelectItem value="Harare Institute of Technology">HIT</SelectItem>
                <SelectItem value="Chinhoyi University of Technology">CUT</SelectItem>
                <SelectItem value="Great Zimbabwe University">GZU</SelectItem>
                <SelectItem value="Bindura University of Science Education">BUSE</SelectItem>
                <SelectItem value="Lupane State University">LSU</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Min $"
              value={filters.minRent}
              onChange={(e) => setFilters({ ...filters, minRent: e.target.value })}
              type="number"
              className="h-9 text-xs rounded-lg"
            />
            <Input
              placeholder="Max $"
              value={filters.maxRent}
              onChange={(e) => setFilters({ ...filters, maxRent: e.target.value })}
              type="number"
              className="h-9 text-xs rounded-lg"
            />
            <Select
              value={filters.gender}
              onValueChange={(value) => setFilters({ ...filters, gender: value })}
            >
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="boys">Boys</SelectItem>
                <SelectItem value="girls">Girls</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.rooms}
              onValueChange={(value) => setFilters({ ...filters, rooms: value })}
            >
              <SelectTrigger className="h-9 text-xs rounded-lg">
                <SelectValue placeholder="Rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="2">2+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="4">4+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-8 max-w-6xl mx-auto">
        {groupedByLocation.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-foreground">No properties available yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          groupedByLocation.map(([location, props]) => (
            <LocationSection
              key={location}
              location={location}
              properties={props}
              occupancyMap={occupancyMap}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
}
