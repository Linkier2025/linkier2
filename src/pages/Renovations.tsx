import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, HardHat, Calendar, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const RENOVATION_TYPES = [
  "Painting",
  "Ceiling",
  "Windows",
  "Floor",
  "Plumbing",
  "Electrical",
  "Other",
];

interface Property {
  id: string;
  title: string;
}

interface Room {
  id: string;
  room_number: string;
  property_id: string;
}

interface Renovation {
  id: string;
  property_id: string;
  room_number: string | null;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  property_title?: string;
}

export default function Renovations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    propertyId: "",
    roomId: "",
    type: "",
    customType: "",
    description: "",
    startDate: "",
    status: "planned",
  });

  useEffect(() => {
    if (user) {
      fetchRenovations();
      fetchProperties();
    }
  }, [user]);

  const fetchRenovations = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("renovations")
      .select("*")
      .eq("landlord_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch property titles
      const propIds = [...new Set(data.map((r) => r.property_id))];
      const { data: props } = await supabase
        .from("properties")
        .select("id, title")
        .in("id", propIds.length > 0 ? propIds : ["none"]);

      const propMap = new Map((props || []).map((p) => [p.id, p.title]));
      setRenovations(
        data.map((r) => ({ ...r, property_title: propMap.get(r.property_id) || "Unknown" }))
      );
    }
    setLoading(false);
  };

  const fetchProperties = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("properties")
      .select("id, title")
      .eq("landlord_id", user.id);
    setProperties(data || []);
  };

  const fetchRooms = async (propertyId: string) => {
    const { data } = await supabase
      .from("rooms")
      .select("id, room_number, property_id")
      .eq("property_id", propertyId)
      .order("room_number");
    setRooms(data || []);
  };

  const handlePropertyChange = (propertyId: string) => {
    setForm((f) => ({ ...f, propertyId, roomId: "" }));
    fetchRooms(propertyId);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.propertyId) {
      toast({ title: "Error", description: "Please select a property.", variant: "destructive" });
      return;
    }
    if (!form.roomId) {
      toast({ title: "Error", description: "Please select a room.", variant: "destructive" });
      return;
    }
    if (!form.type) {
      toast({ title: "Error", description: "Please select a renovation type.", variant: "destructive" });
      return;
    }

    const title = form.type === "Other" ? form.customType.trim() || "Other" : form.type;
    const selectedRoom = rooms.find((r) => r.id === form.roomId);

    setSaving(true);
    const { error } = await supabase.from("renovations").insert({
      property_id: form.propertyId,
      landlord_id: user.id,
      room_number: selectedRoom?.room_number || null,
      title,
      description: form.description.trim() || null,
      start_date: form.startDate || null,
      status: form.status,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add renovation.", variant: "destructive" });
    } else {
      // Update room renovation status if ongoing
      if (form.status === "in_progress" && selectedRoom) {
        await supabase
          .from("rooms")
          .update({
            renovation_status: "under_renovation",
            renovation_description: title,
            renovation_start_date: form.startDate || null,
          })
          .eq("id", form.roomId);
      }

      toast({ title: "Renovation added", description: `${title} renovation has been added.` });
      setShowForm(false);
      setForm({ propertyId: "", roomId: "", type: "", customType: "", description: "", startDate: "", status: "planned" });
      fetchRenovations();
    }
    setSaving(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Planned</Badge>;
      case "in_progress":
        return <Badge className="bg-warning text-warning-foreground">Ongoing</Badge>;
      case "completed":
        return <Badge className="bg-success text-success-foreground">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/manage")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex-1">Renovations</h1>
          {!showForm && (
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          )}
        </div>

        {/* Add Renovation Form */}
        {showForm && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">New Renovation</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Property *</Label>
                  <Select value={form.propertyId} onValueChange={handlePropertyChange}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Room *</Label>
                  <Select value={form.roomId} onValueChange={(v) => setForm((f) => ({ ...f, roomId: v }))} disabled={!form.propertyId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Renovation Type *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {RENOVATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.type === "Other" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Custom Type</Label>
                    <Input
                      value={form.customType}
                      onChange={(e) => setForm((f) => ({ ...f, customType: e.target.value }))}
                      placeholder="e.g. Roof repair"
                      className="w-full"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Details about the renovation..."
                    className="w-full resize-none"
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Start Date (optional)</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="in_progress">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={saving}>
                {saving ? "Adding..." : "Add Renovation"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Renovations List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : renovations.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <HardHat className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">No renovations yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Add a renovation to track room maintenance</p>
              </div>
              {!showForm && (
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Renovation
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {renovations.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <HardHat className="h-5 w-5 text-warning" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{r.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {r.property_title} — Room {r.room_number || "N/A"}
                        </p>
                        {r.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                        )}
                        {r.start_date && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Started {new Date(r.start_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(r.status)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
