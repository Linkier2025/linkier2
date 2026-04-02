import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PropertyCard } from "@/components/PropertyCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWishlist } from "@/hooks/useWishlist";

interface Property {
  id: string;
  title: string;
  rent_amount: number;
  location: string;
  rooms: number;
  gender_preference: string | null;
  rating: number | null;
  images: string[] | null;
}

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { wishlistIds, toggleWishlist, loading: wishlistLoading } = useWishlist();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Saved | Linkier";
  }, []);

  useEffect(() => {
    if (wishlistLoading) return;
    const fetchProperties = async () => {
      if (wishlistIds.length === 0) {
        setProperties([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("properties")
        .select("id, title, rent_amount, location, rooms, gender_preference, rating, images")
        .in("id", wishlistIds);
      setProperties((data as Property[]) || []);
      setLoading(false);
    };
    fetchProperties();
  }, [wishlistIds, wishlistLoading]);

  if (loading || wishlistLoading) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Saved</h1>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <Heart className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h2 className="text-lg font-semibold">No saved properties yet</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-6">
          Tap the heart icon on listings to save them here.
        </p>
        <Button onClick={() => navigate("/explore")}>
          <Search className="h-4 w-4 mr-2" />
          Explore listings
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <h1 className="text-xl font-bold text-foreground">Saved</h1>
      <div className="grid grid-cols-2 gap-3">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            id={property.id}
            title={property.title}
            rent_amount={property.rent_amount}
            location={property.location}
            rooms={property.rooms}
            gender_preference={property.gender_preference}
            rating={property.rating || 0}
            images={property.images}
            isFavorite={true}
            onToggleFavorite={toggleWishlist}
          />
        ))}
      </div>
    </div>
  );
}
