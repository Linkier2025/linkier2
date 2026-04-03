import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { RoomFurnitureManager } from "@/components/RoomFurnitureManager";
import { getSpaceTypeLabel, getSpaceTypeIcon } from "@/lib/spaceConfig";

interface SpaceData {
  id: string;
  room_number: string;
  type: string;
  capacity: number | null;
  gender_tag: string | null;
  property_id: string;
  renovation_status: string;
  renovation_description: string | null;
  property_title: string;
}

export default function SpaceDetail() {
  const { spaceId } = useParams();
  const { user } = useAuth();
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [occupants, setOccupants] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!spaceId) return;
    const fetch = async () => {
      const { data: room } = await supabase
        .from("rooms")
        .select("id, room_number, type, capacity, gender_tag, property_id, renovation_status, renovation_description")
        .eq("id", spaceId)
        .single();

      if (!room) { setLoading(false); return; }

      const { data: prop } = await supabase
        .from("properties")
        .select("title")
        .eq("id", room.property_id)
        .single();

      let count = 0;
      if (room.type === "bedroom") {
        const { count: c } = await supabase
          .from("room_assignments")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id)
          .in("status", ["active", "reserved"]);
        count = c || 0;
      }

      setSpace({ ...room, property_title: prop?.title || "Property" });
      setOccupants(count);
      setLoading(false);
    };
    fetch();
  }, [spaceId]);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!space) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-2xl mx-auto text-center">
        <p className="text-muted-foreground">Space not found</p>
        <Link to="/my-properties">
          <Button className="mt-4">Back to Properties</Button>
        </Link>
      </div>
    );
  }

  const isBedroom = space.type === "bedroom";
  const isRenovation = space.renovation_status === "under_renovation";

  return (
    <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/my-properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{space.room_number}</h1>
          <p className="text-sm text-muted-foreground">{space.property_title}</p>
        </div>
      </div>

      {/* Space Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="text-2xl">{getSpaceTypeIcon(space.type)}</span>
            {space.room_number}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{getSpaceTypeLabel(space.type)}</Badge>
            {space.gender_tag && <Badge variant="outline">{space.gender_tag}</Badge>}
            {isRenovation && (
              <Badge variant="outline" className="border-amber-500 text-amber-700">🔧 Under Renovation</Badge>
            )}
          </div>

          {isBedroom && space.capacity && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{occupants}/{space.capacity} occupied</span>
            </div>
          )}

          {isRenovation && space.renovation_description && (
            <p className="text-sm text-muted-foreground">{space.renovation_description}</p>
          )}
        </CardContent>
      </Card>

      {/* Furniture Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Furniture & Appliances</CardTitle>
        </CardHeader>
        <CardContent>
          <RoomFurnitureManager roomId={space.id} spaceType={space.type} />
        </CardContent>
      </Card>
    </div>
  );
}
