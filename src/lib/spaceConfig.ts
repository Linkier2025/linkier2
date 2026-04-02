export const SPACE_TYPES = [
  { value: "bedroom", label: "Bedroom", icon: "🛏️" },
  { value: "kitchen", label: "Kitchen", icon: "🍳" },
  { value: "bathroom", label: "Bathroom", icon: "🚿" },
  { value: "toilet", label: "Toilet", icon: "🚽" },
  { value: "living_room", label: "Living Room", icon: "🛋️" },
  { value: "dining_area", label: "Dining Area", icon: "🍽️" },
  { value: "utility_room", label: "Utility Room", icon: "🧺" },
] as const;

export type SpaceType = (typeof SPACE_TYPES)[number]["value"];

export function getSpaceTypeLabel(type: string): string {
  return SPACE_TYPES.find((t) => t.value === type)?.label || type;
}

export function getSpaceTypeIcon(type: string): string {
  return SPACE_TYPES.find((t) => t.value === type)?.icon || "📦";
}

/** Auto-generate a name like "Room 1", "Kitchen 2" based on existing spaces of same type */
export function generateSpaceName(
  type: SpaceType,
  existingSpaces: { type: string; room_number: string }[]
): string {
  const prefix = getSpaceTypeLabel(type);
  const sameType = existingSpaces.filter((s) => s.type === type);
  const nextNum = sameType.length + 1;
  return type === "bedroom" ? `Room ${nextNum}` : `${prefix} ${nextNum}`;
}

/** Furniture items valid for each space type */
export const FURNITURE_BY_SPACE_TYPE: Record<string, string[]> = {
  bedroom: [
    "Study Chair", "Study Table", "Mattress", "Bed Base",
    "Cabinet", "WiFi Router / Starlink",
  ],
  kitchen: [
    "Stove", "Refrigerator", "Dishwasher", "Cabinet",
    "Bench", "WiFi Router / Starlink",
  ],
  bathroom: ["Cabinet"],
  toilet: [],
  living_room: [
    "Study Chair", "Study Table", "Garden Chairs",
    "Cabinet", "Bench", "WiFi Router / Starlink",
  ],
  dining_area: ["Study Table", "Bench", "Cabinet", "Garden Chairs"],
  utility_room: ["Washing Machine", "Cabinet"],
};

export function getValidFurnitureForSpace(type: string): string[] {
  return FURNITURE_BY_SPACE_TYPE[type] || [];
}
