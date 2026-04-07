import { MapPin } from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";

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

interface LocationSectionProps {
  location: string;
  properties: Property[];
  occupancyMap: Record<string, PropertyOccupancy>;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export function LocationSection({
  location,
  properties,
  occupancyMap,
  favorites,
  onToggleFavorite,
}: LocationSectionProps) {
  return (
    <section className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <MapPin className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{location}</h2>
        <span className="text-xs text-muted-foreground">
          {properties.length} {properties.length === 1 ? "property" : "properties"}
        </span>
      </div>

      {/* 2-column grid layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            id={property.id}
            title={property.title}
            rent_amount={property.rent_amount}
            location={property.location}
            rooms={property.rooms}
            gender_preference={property.gender_preference}
            rating={property.rating ?? 0}
            images={property.images}
            isFavorite={favorites.includes(property.id)}
            occupancy={occupancyMap[property.id]}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}
