import { Heart, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Link } from "react-router-dom";
import { UNIVERSITY_SHORT } from "@/lib/locationConfig";

interface PropertyCardProps {
  id: string;
  title: string;
  rent_amount: number;
  location: string;
  location_city?: string | null;
  location_area?: string | null;
  target_universities?: string[] | null;
  rooms: number;
  gender_preference: string | null;
  rating: number;
  images: string[] | null;
  isFavorite: boolean;
  occupancy?: {
    totalOccupants: number;
    totalCapacity: number;
    availableRooms: number;
    isFullyOccupied: boolean;
  };
  onToggleFavorite: (id: string) => void;
}

export function PropertyCard({
  id,
  title,
  rent_amount,
  location,
  location_city,
  location_area,
  target_universities,
  rooms,
  gender_preference,
  rating,
  images,
  isFavorite,
  occupancy,
  onToggleFavorite,
}: PropertyCardProps) {
  const displayLocation = [location_area, location_city].filter(Boolean).join(", ") || location;
  const uniTags = (target_universities || []).map((u) => UNIVERSITY_SHORT[u] || u);

  return (
    <Link to={`/property/${id}`} className="block group">
      <div className="rounded-xl overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative">
          <div className="h-[130px] sm:h-[150px]">
            <img
              src={images?.[0] || "/placeholder.svg"}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/80 hover:bg-background backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(id);
            }}
          >
            <Heart
              className={`h-3.5 w-3.5 ${isFavorite ? "fill-destructive text-destructive" : "text-foreground/60"}`}
            />
          </Button>
          {occupancy?.isFullyOccupied && (
            <Badge className="absolute top-1.5 left-1.5 bg-destructive/90 text-destructive-foreground text-[9px] px-1 py-0">
              Full
            </Badge>
          )}
          {uniTags.length > 0 && (
            <Badge className="absolute bottom-1.5 left-1.5 bg-primary/90 text-primary-foreground text-[9px] px-1 py-0 max-w-[90%] truncate">
              For {uniTags.join(", ")}
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="p-2.5 space-y-0.5">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-xs text-foreground leading-tight line-clamp-1">
              {title}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0">
              <Star className="h-2.5 w-2.5 fill-warning text-warning" />
              <span className="text-[10px] text-foreground">{rating || "–"}</span>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground line-clamp-1">{displayLocation}</p>

          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{gender_preference || "Mixed"}</span>
            {occupancy && (
              <Badge
                variant={occupancy.isFullyOccupied ? "destructive" : "secondary"}
                className="text-[9px] px-1 py-0 leading-tight"
              >
                {occupancy.isFullyOccupied ? "Full" : `${occupancy.availableRooms} avail.`}
              </Badge>
            )}
          </div>

          <p className="text-xs font-bold text-primary">
            ${rent_amount.toLocaleString()}
            <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
