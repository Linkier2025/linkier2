import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LocationSection } from "@/components/LocationSection";
import { StudentLayout } from "@/components/StudentLayout";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { CITY_NAMES, UNIVERSITIES, UNIVERSITY_SHORT } from "@/lib/locationConfig";

interface Property {
  id: string;
  title: string;
  rent_amount: number;
  location: string;
  location_city: string | null;
  location_area: string | null;
  university: string | null;
  rooms: number;
  gender_preference: string | null;
  rating: number;
  images: string[] | null;
  amenities: string[] | null;
  target_universities: string[] | null;
}

interface PropertyOccupancy {
  totalCapacity: number;
  totalOccupants: number;
  availableRooms: number;
  totalRooms: number;
  isFullyOccupied: boolean;
}

export default function Explore() {
  const [searchTerm, setSearchTerm] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [occupancyMap, setOccupancyMap] = useState<Record<string, PropertyOccupancy>>({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [studentUniversity, setStudentUniversity] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    university: "",
    minRent: "",
    maxRent: "",
    gender: "",
    rooms: "",
    city: "",
  });
  const { wishlistIds: favorites, toggleWishlist: toggleFavorite } = useWishlist();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    document.title = "Explore Properties | Linkier";
    fetchProperties();
    fetchStudentUniversity();
  }, []);

  const fetchStudentUniversity = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("university")
      .eq("user_id", user.id)
      .single();
    if (data?.university) setStudentUniversity(data.university);
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("status", "available");

      if (error) throw error;
      setProperties((data as any) || []);

      const propertyIds = (data || []).map((p: any) => p.id);
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

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (property.location_city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (property.location_area || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUniversity =
        !filters.university || 
        (property.target_universities && property.target_universities.includes(filters.university)) ||
        property.university === filters.university;
      const matchesMinRent =
        !filters.minRent || property.rent_amount >= Number(filters.minRent);
      const matchesMaxRent =
        !filters.maxRent || property.rent_amount <= Number(filters.maxRent);
      const matchesGender =
        !filters.gender ||
        property.gender_preference?.toLowerCase() === filters.gender.toLowerCase();
      const matchesRooms =
        !filters.rooms || property.rooms >= Number(filters.rooms);
      const matchesCity =
        !filters.city || (property.location_city || "").toLowerCase() === filters.city.toLowerCase();

      // University-based visibility: show if no target restriction OR student's uni matches
      const matchesTargetUni =
        !property.target_universities ||
        property.target_universities.length === 0 ||
        !studentUniversity ||
        property.target_universities.includes(studentUniversity);

      return (
        matchesSearch &&
        matchesUniversity &&
        matchesMinRent &&
        matchesMaxRent &&
        matchesGender &&
        matchesRooms &&
        matchesCity &&
        matchesTargetUni
      );
    });
  }, [properties, searchTerm, filters, studentUniversity]);

  // Group by sub_location (location_area), with city context
  const groupedByArea = useMemo(() => {
    const groups: Record<string, Property[]> = {};
    filteredProperties.forEach((p) => {
      const area = p.location_area || p.location || "Other";
      const city = p.location_city || "Harare";
      const key = `${area}|||${city}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups)
      .map(([key, props]) => {
        const [area, city] = key.split("|||");
        return { area, city, properties: props };
      })
      .sort((a, b) => a.area.localeCompare(b.area));
  }, [filteredProperties]);

  const clearFilters = () => {
    setFilters({ university: "", minRent: "", maxRent: "", gender: "", rooms: "", city: "" });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-muted-foreground text-sm">Loading properties...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 space-y-3">
        <h1 className="text-xl font-bold text-foreground">Explore</h1>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search city, area, or property..."
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
          <div className="space-y-2 pt-1 pb-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Select
                value={filters.city}
                onValueChange={(value) => setFilters({ ...filters, city: value })}
              >
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {CITY_NAMES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.university}
                onValueChange={(value) => setFilters({ ...filters, university: value })}
              >
                <SelectTrigger className="h-9 text-xs rounded-lg">
                  <SelectValue placeholder="University" />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSITIES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-5 space-y-8 max-w-6xl mx-auto">
        {groupedByLocation.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-lg font-medium text-foreground">No properties found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {hasActiveFilters
                ? "Try removing some filters or searching nearby locations"
                : "No properties available yet"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" className="mt-3" onClick={clearFilters}>
                Clear all filters
              </Button>
            )}
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
    </StudentLayout>
  );
}
