import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";
import { ArrowLeft, Megaphone, Plus, Send, Home, DoorOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  property_id: string;
  room_id: string | null;
  property_name?: string;
  room_number?: string | null;
}

interface PropertyOption {
  id: string;
  title: string;
  rooms: { id: string; room_number: string }[];
}

const Announcements = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const isLandlord = profile?.user_type === "landlord";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Announcements | Linkier";
  }, []);

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
      if (isLandlord) fetchProperties();
    }
  }, [user, isLandlord]);

  const fetchAnnouncements = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, message, created_at, property_id, room_id")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Enrich with property/room names
      const enriched: Announcement[] = [];
      for (const a of data || []) {
        const { data: prop } = await supabase
          .from("properties")
          .select("title")
          .eq("id", a.property_id)
          .single();

        let roomNumber: string | null = null;
        if (a.room_id) {
          const { data: room } = await supabase
            .from("rooms")
            .select("room_number")
            .eq("id", a.room_id)
            .single();
          roomNumber = room?.room_number || null;
        }

        enriched.push({
          ...a,
          property_name: prop?.title || "Unknown Property",
          room_number: roomNumber,
        });
      }
      setAnnouncements(enriched);
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("properties")
      .select("id, title")
      .eq("landlord_id", user.id);

    const options: PropertyOption[] = [];
    for (const p of data || []) {
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, room_number")
        .eq("property_id", p.id)
        .order("room_number");
      options.push({ id: p.id, title: p.title, rooms: rooms || [] });
    }
    setProperties(options);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !message.trim() || !selectedProperty) {
      toast({ title: "Error", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("announcements").insert({
        landlord_id: user.id,
        property_id: selectedProperty,
        room_id: selectedRoom === "all" ? null : selectedRoom,
        title: title.trim(),
        message: message.trim(),
      });

      if (error) throw error;

      toast({ title: "Announcement sent!" });
      setTitle("");
      setMessage("");
      setSelectedProperty("");
      setSelectedRoom("all");
      setDialogOpen(false);
      fetchAnnouncements();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const selectedPropertyRooms = properties.find((p) => p.id === selectedProperty)?.rooms || [];

  return (
    <div className="px-4 pt-6 pb-4">
      <main className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          {isLandlord && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Property</Label>
                    <Select value={selectedProperty} onValueChange={(v) => { setSelectedProperty(v); setSelectedRoom("all"); }}>
                      <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                      <SelectContent>
                        {properties.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Target</Label>
                    <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Entire Property</SelectItem>
                        {selectedPropertyRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>Room {r.room_number}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water maintenance" />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement..." rows={4} />
                  </div>
                  <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                    <Send className="h-4 w-4 mr-2" /> {submitting ? "Sending..." : "Send Announcement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground">No announcements yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isLandlord ? "Create your first announcement to notify tenants." : "Check back later for updates from your landlord."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-foreground">{a.title}</h3>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap mb-3">{a.message}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      <Home className="h-3 w-3 mr-1" /> {a.property_name}
                    </Badge>
                    {a.room_number ? (
                      <Badge variant="secondary" className="text-xs">
                        <DoorOpen className="h-3 w-3 mr-1" /> Room {a.room_number}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">All Tenants</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Announcements;
