import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useWishlist() {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("wishlists")
      .select("property_id")
      .eq("student_id", user.id);
    setWishlistIds((data || []).map((w: any) => w.property_id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(
    async (propertyId: string) => {
      if (!user) return;
      const isSaved = wishlistIds.includes(propertyId);

      // Optimistic update
      setWishlistIds((prev) =>
        isSaved ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
      );

      if (isSaved) {
        await supabase
          .from("wishlists")
          .delete()
          .eq("student_id", user.id)
          .eq("property_id", propertyId);
      } else {
        await supabase
          .from("wishlists")
          .insert({ student_id: user.id, property_id: propertyId });
      }
    },
    [user, wishlistIds]
  );

  return { wishlistIds, toggleWishlist, loading, refetch: fetchWishlist };
}
