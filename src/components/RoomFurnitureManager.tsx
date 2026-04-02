import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Package, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getValidFurnitureForSpace } from "@/lib/spaceConfig";

const ALL_FURNITURE_ITEMS = [
  "Study Chair", "Study Table", "Garden Chairs", "Mattress",
  "Bed Base", "Cabinet", "Stove", "Refrigerator", "Bench",
  "Dishwasher", "Washing Machine", "WiFi Router / Starlink",
];

interface FurnitureItem {
  id: string;
  room_id: string;
  item_name: string;
  quantity: number;
}

interface RoomFurnitureManagerProps {
  roomId: string;
  readOnly?: boolean;
  spaceType?: string;
}

export function RoomFurnitureManager({ roomId, readOnly = false, spaceType = "bedroom" }: RoomFurnitureManagerProps) {
  const [items, setItems] = useState<FurnitureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState(1);

  useEffect(() => {
    fetchFurniture();
  }, [roomId]);

  const fetchFurniture = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("room_furniture")
      .select("*")
      .eq("room_id", roomId)
      .order("item_name");
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newItem) return;
    // Validate item is allowed for this space type
    const validItems = getValidFurnitureForSpace(spaceType);
    if (validItems.length > 0 && !validItems.includes(newItem)) {
      toast({ title: "Not allowed", description: `"${newItem}" is not allowed in this space type.`, variant: "destructive" });
      return;
    }
    setAdding(true);
    const { data, error } = await supabase
      .from("room_furniture")
      .insert({ room_id: roomId, item_name: newItem, quantity: newQty })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" });
    } else {
      setItems(prev => [...prev, data].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      setNewItem("");
      setNewQty(1);
      toast({ title: "Item added" });
    }
    setAdding(false);
  };

  const handleUpdateQty = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    const { error } = await supabase
      .from("room_furniture")
      .update({ quantity })
      .eq("id", id);
    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("room_furniture")
      .delete()
      .eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Item removed" });
    }
  };

  const getItemIcon = (name: string) => {
    const icons: Record<string, string> = {
      "Study Chair": "🪑", "Study Table": "🪵", "Garden Chairs": "🪑",
      "Mattress": "🛏", "Bed Base": "🛏", "Cabinet": "🗄",
      "Stove": "🍳", "Refrigerator": "🧊", "Bench": "🪑",
      "Dishwasher": "🍽", "Washing Machine": "🧺",
      "WiFi Router / Starlink": "📶",
    };
    return icons[name] || "📦";
  };

  // Filter available items based on space type
  const validForType = getValidFurnitureForSpace(spaceType);
  const allowedItems = validForType.length > 0 ? ALL_FURNITURE_ITEMS.filter(n => validForType.includes(n)) : ALL_FURNITURE_ITEMS;
  const existingNames = items.map(i => i.item_name);
  const availableItems = allowedItems.filter(name => !existingNames.includes(name));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (readOnly) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium flex items-center gap-1.5">
          <Package className="h-4 w-4" />
          Furniture & Appliances
        </h4>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge key={item.id} variant="secondary" className="text-xs gap-1 py-1">
              {getItemIcon(item.item_name)} {item.item_name}
              {item.quantity > 1 && <span className="text-muted-foreground">×{item.quantity}</span>}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        <Package className="h-4 w-4" />
        Furniture & Appliances
      </h4>

      {items.length > 0 && (
        <div className="space-y-1.5">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
              <span className="text-base">{getItemIcon(item.item_name)}</span>
              <span className="text-sm font-medium flex-1">{item.item_name}</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-6 w-6"
                  onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1}>-</Button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <Button variant="outline" size="icon" className="h-6 w-6"
                  onClick={() => handleUpdateQty(item.id, item.quantity + 1)}>+</Button>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {availableItems.length > 0 && (
        <div className="flex gap-2">
          <Select value={newItem} onValueChange={setNewItem}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder="Add item..." />
            </SelectTrigger>
            <SelectContent>
              {availableItems.map(name => (
                <SelectItem key={name} value={name}>
                  {getItemIcon(name)} {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" min={1} value={newQty}
            onChange={e => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 h-9 text-sm" />
          <Button size="sm" className="h-9" onClick={handleAdd} disabled={!newItem || adding}>
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
      )}

      {items.length === 0 && availableItems.length > 0 && (
        <p className="text-xs text-muted-foreground">No items added yet</p>
      )}

      {validForType.length === 0 && (
        <p className="text-xs text-muted-foreground">No furniture items applicable for this space type</p>
      )}
    </div>
  );
}

export { ALL_FURNITURE_ITEMS as FURNITURE_ITEMS };
