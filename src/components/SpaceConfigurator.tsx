import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Home, ChefHat, Bath, Sofa } from "lucide-react";
import { SPACE_TYPES, SpaceType, generateSpaceName, getSpaceTypeIcon, getSpaceTypeLabel } from "@/lib/spaceConfig";

export interface SpaceConfiguration {
  room_number: string; // name field in DB
  type: SpaceType;
  capacity: number | null;
  gender_tag: string | null;
}

interface SpaceConfiguratorProps {
  spaces: SpaceConfiguration[];
  onSpacesChange: (spaces: SpaceConfiguration[]) => void;
  editMode?: boolean;
}

export function SpaceConfigurator({ spaces, onSpacesChange, editMode = true }: SpaceConfiguratorProps) {
  const [addingType, setAddingType] = useState<string>("");

  const addSpace = () => {
    if (!addingType) return;
    const type = addingType as SpaceType;
    const name = generateSpaceName(type, spaces);
    const newSpace: SpaceConfiguration = {
      room_number: name,
      type,
      capacity: type === "bedroom" ? 1 : null,
      gender_tag: null,
    };
    onSpacesChange([...spaces, newSpace]);
    setAddingType("");
  };

  const removeSpace = (index: number) => {
    onSpacesChange(spaces.filter((_, i) => i !== index));
  };

  const updateSpace = (index: number, field: keyof SpaceConfiguration, value: any) => {
    onSpacesChange(spaces.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const bedrooms = spaces.filter((s) => s.type === "bedroom");
  const sharedSpaces = spaces.filter((s) => s.type !== "bedroom");

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "kitchen": return <ChefHat className="h-4 w-4" />;
      case "bathroom": case "toilet": return <Bath className="h-4 w-4" />;
      case "living_room": case "dining_area": return <Sofa className="h-4 w-4" />;
      default: return <Home className="h-4 w-4" />;
    }
  };

  if (!editMode) {
    return (
      <div className="space-y-6">
        {bedrooms.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Home className="h-5 w-5" /> Bedrooms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bedrooms.map((space, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span>{getSpaceTypeIcon(space.type)}</span>
                    <span className="text-sm font-medium">{space.room_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{space.capacity} student(s)</Badge>
                    {space.gender_tag && (
                      <Badge variant="outline">{space.gender_tag}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {sharedSpaces.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sofa className="h-5 w-5" /> Shared Spaces
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sharedSpaces.map((space, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span>{getSpaceTypeIcon(space.type)}</span>
                    <span className="text-sm font-medium">{space.room_number}</span>
                    <Badge variant="secondary" className="text-xs">{getSpaceTypeLabel(space.type)}</Badge>
                  </div>
                  {space.gender_tag && (
                    <Badge variant="outline">{space.gender_tag}</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {spaces.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No spaces configured</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bedrooms Section */}
      {bedrooms.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Home className="h-4 w-4" /> Bedrooms ({bedrooms.length})
          </h3>
          {bedrooms.map((space, globalIndex) => {
            const idx = spaces.indexOf(space);
            return (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getSpaceTypeIcon(space.type)}</span>
                  <Input
                    value={space.room_number}
                    onChange={(e) => updateSpace(idx, "room_number", e.target.value)}
                    className="flex-1 h-8 text-sm"
                    placeholder="Room name"
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => removeSpace(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Capacity</Label>
                    <Select value={(space.capacity ?? 1).toString()}
                      onValueChange={(v) => updateSpace(idx, "capacity", parseInt(v))}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={n.toString()}>{n} Student{n > 1 ? "s" : ""}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Gender (optional)</Label>
                    <Select value={space.gender_tag || "none"}
                      onValueChange={(v) => updateSpace(idx, "gender_tag", v === "none" ? null : v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any</SelectItem>
                        <SelectItem value="Boys">Boys</SelectItem>
                        <SelectItem value="Girls">Girls</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Spaces Section */}
      {sharedSpaces.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Sofa className="h-4 w-4" /> Shared Spaces ({sharedSpaces.length})
          </h3>
          {sharedSpaces.map((space) => {
            const idx = spaces.indexOf(space);
            const needsGender = space.type === "bathroom" || space.type === "toilet";
            return (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getSpaceTypeIcon(space.type)}</span>
                  <Input
                    value={space.room_number}
                    onChange={(e) => updateSpace(idx, "room_number", e.target.value)}
                    className="flex-1 h-8 text-sm"
                    placeholder="Space name"
                  />
                  <Badge variant="outline" className="text-xs shrink-0">{getSpaceTypeLabel(space.type)}</Badge>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => removeSpace(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {needsGender && (
                  <div className="w-1/2">
                    <Label className="text-xs text-muted-foreground">Gender (optional)</Label>
                    <Select value={space.gender_tag || "none"}
                      onValueChange={(v) => updateSpace(idx, "gender_tag", v === "none" ? null : v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any</SelectItem>
                        <SelectItem value="Boys">Boys</SelectItem>
                        <SelectItem value="Girls">Girls</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Space */}
      <div className="flex gap-2">
        <Select value={addingType} onValueChange={setAddingType}>
          <SelectTrigger className="flex-1 h-9 text-sm">
            <SelectValue placeholder="Select space type..." />
          </SelectTrigger>
          <SelectContent>
            {SPACE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.icon} {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={addSpace} disabled={!addingType} className="h-9">
          <Plus className="h-4 w-4 mr-1" /> Add Space
        </Button>
      </div>

      {spaces.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No spaces added yet. Select a type and click "Add Space" to begin.
        </p>
      )}
    </div>
  );
}
