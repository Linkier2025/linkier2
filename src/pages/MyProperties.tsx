import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Edit, Trash2, Plus, ChevronDown, ChevronUp, Hammer, Calendar, DollarSign, Home, Users, AlertCircle, Package } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getSpaceTypeLabel, getSpaceTypeIcon } from "@/lib/spaceConfig";

interface RoomConfig {
  room_number: string;
  capacity: number;
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
  estimated_cost: number | null;
}

interface Property {
  id: string;
  title: string;
  rent_amount: number;
  location: string;
  university: string | null;
  rooms: number;
  gender_preference: string | null;
  status: string;
  images: string[] | null;
  amenities: string[] | null;
  room_configurations?: RoomConfig[];
}

interface RoomWithOccupancy {
  id: string;
  room_number: string;
  capacity: number;
  type: string;
  gender_tag: string | null;
  property_id: string;
  renovation_status: string;
  renovation_description: string | null;
  renovation_start_date: string | null;
  renovation_end_date: string | null;
  current_occupants: number;
}

interface RoomStatus {
  id: string;
  room_number: string;
  capacity: number;
  type: string;
  current_occupants: number;
  isFull: boolean;
  isUnderRenovation: boolean;
  renovation_description: string | null;
  renovation_end_date: string | null;
  gender_tag: string | null;
}

const statusColors: Record<string, string> = {
  planned: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function MyProperties() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [roomsData, setRoomsData] = useState<RoomWithOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  
  // Renovation dialog state
  const [renovationDialogOpen, setRenovationDialogOpen] = useState(false);
  const [editingRenovation, setEditingRenovation] = useState<Renovation | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [renovationForm, setRenovationForm] = useState({
    room_number: "",
    title: "",
    description: "",
    status: "planned",
    start_date: "",
    end_date: "",
    estimated_cost: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [propertiesRes, renovationsRes] = await Promise.all([
        supabase.from('properties').select('*').eq('landlord_id', user.id).order('created_at', { ascending: false }),
        supabase.from('renovations').select('*').eq('landlord_id', user.id),
      ]);

      if (propertiesRes.error) throw propertiesRes.error;
      if (renovationsRes.error) throw renovationsRes.error;

      const typedProperties = (propertiesRes.data || []).map(property => ({
        ...property,
        room_configurations: property.room_configurations as unknown as RoomConfig[] | undefined
      }));

      setProperties(typedProperties);
      setRenovations(renovationsRes.data || []);

      const propertyIds = typedProperties.map(p => p.id);
      if (propertyIds.length > 0) {
        const { data: rooms } = await supabase
          .from('rooms')
          .select('id, room_number, capacity, type, gender_tag, property_id, renovation_status, renovation_description, renovation_start_date, renovation_end_date')
          .in('property_id', propertyIds);

        const roomIds = (rooms || []).map(r => r.id);
        let assignmentCounts: Record<string, number> = {};

        if (roomIds.length > 0) {
          const { data: assignments } = await supabase
            .from('room_assignments')
            .select('room_id')
            .in('room_id', roomIds)
            .in('status', ['active', 'reserved']);
          (assignments || []).forEach(a => {
            assignmentCounts[a.room_id] = (assignmentCounts[a.room_id] || 0) + 1;
          });
        }

        const roomsWithOcc: RoomWithOccupancy[] = (rooms || []).map(r => ({
          id: r.id,
          room_number: r.room_number,
          capacity: r.capacity,
          type: r.type || 'bedroom',
          gender_tag: r.gender_tag || null,
          property_id: r.property_id,
          renovation_status: r.renovation_status,
          renovation_description: r.renovation_description,
          renovation_start_date: r.renovation_start_date,
          renovation_end_date: r.renovation_end_date,
          current_occupants: assignmentCounts[r.id] || 0,
        }));
        setRoomsData(roomsWithOcc);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || deleteConfirmText !== "DELETE") return;
    const propertyRooms = roomsData.filter(r => r.property_id === deleteId);
    const hasActiveTenants = propertyRooms.some(r => r.current_occupants > 0);
    if (hasActiveTenants) { setDeleteError("Cannot delete property with active tenants."); return; }

    try {
      const { error } = await supabase.from('properties').delete().eq('id', deleteId);
      if (error) throw error;
      setProperties(prev => prev.filter(p => p.id !== deleteId));
      toast({ title: "Property deleted", description: "Property has been successfully removed." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete property", variant: "destructive" });
    } finally {
      setDeleteId(null); setDeleteConfirmText(""); setDeleteError("");
    }
  };

  const getRoomStatuses = (property: Property): RoomStatus[] => {
    return roomsData.filter(r => r.property_id === property.id).map(room => {
      const isUnderRenovation = room.renovation_status === 'under_renovation';
      const isBedroom = room.type === 'bedroom';
      return {
        id: room.id,
        room_number: room.room_number,
        capacity: room.capacity,
        type: room.type,
        gender_tag: room.gender_tag,
        current_occupants: room.current_occupants,
        isFull: isBedroom && !isUnderRenovation && room.current_occupants >= room.capacity,
        isUnderRenovation,
        renovation_description: room.renovation_description,
        renovation_end_date: room.renovation_end_date,
      };
    });
  };

  const getPropertyRenovations = (propertyId: string) => renovations.filter(r => r.property_id === propertyId);

  const resetRenovationForm = () => {
    setRenovationForm({ room_number: "", title: "", description: "", status: "planned", start_date: "", end_date: "", estimated_cost: "" });
    setEditingRenovation(null);
  };

  const openRenovationDialog = (propertyId: string, renovation?: Renovation) => {
    setSelectedPropertyId(propertyId);
    if (renovation) {
      setEditingRenovation(renovation);
      setRenovationForm({
        room_number: renovation.room_number || "",
        title: renovation.title,
        description: renovation.description || "",
        status: renovation.status,
        start_date: renovation.start_date || "",
        end_date: renovation.end_date || "",
        estimated_cost: renovation.estimated_cost?.toString() || "",
      });
    } else {
      resetRenovationForm();
    }
    setRenovationDialogOpen(true);
  };

  const getSelectedPropertyRooms = () => {
    return roomsData.filter(r => r.property_id === selectedPropertyId);
  };

  const handleRenovationSubmit = async () => {
    if (!renovationForm.title || !selectedPropertyId) {
      toast({ title: "Missing fields", description: "Please fill in the title", variant: "destructive" });
      return;
    }
    try {
      const renovationData = {
        property_id: selectedPropertyId,
        landlord_id: user?.id,
        room_number: renovationForm.room_number === "general" ? null : renovationForm.room_number || null,
        title: renovationForm.title,
        description: renovationForm.description || null,
        status: renovationForm.status,
        start_date: renovationForm.start_date || null,
        end_date: renovationForm.end_date || null,
        estimated_cost: renovationForm.estimated_cost ? parseFloat(renovationForm.estimated_cost) : null,
      };

      if (editingRenovation) {
        const { error } = await supabase.from('renovations').update(renovationData).eq('id', editingRenovation.id);
        if (error) throw error;
        toast({ title: "Renovation updated" });
      } else {
        const { error } = await supabase.from('renovations').insert(renovationData);
        if (error) throw error;
        toast({ title: "Renovation added" });
      }

      setRenovationDialogOpen(false);
      resetRenovationForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save renovation", variant: "destructive" });
    }
  };

  const handleDeleteRenovation = async (id: string) => {
    try {
      const { error } = await supabase.from('renovations').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Renovation deleted" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete renovation", variant: "destructive" });
    }
  };

  const handleRenovationStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('renovations').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast({ title: "Status updated" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 flex items-center justify-center">
        <p>Loading properties...</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Properties</h1>
          <Link to="/add-property">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </Link>
        </div>

        {properties.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">You haven't added any properties yet.</p>
              <Link to="/add-property">
                <Button>Add Your First Property</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {properties.map((property) => {
              const roomStatuses = getRoomStatuses(property);
              const bedroomStatuses = roomStatuses.filter(r => r.type === 'bedroom');
              const sharedStatuses = roomStatuses.filter(r => r.type !== 'bedroom');
              const propertyRenovations = getPropertyRenovations(property.id);
              const occupiedCount = bedroomStatuses.filter(r => r.current_occupants > 0).length;
              const availableCount = bedroomStatuses.filter(r => !r.isFull && !r.isUnderRenovation).length;
              const isFullyOccupied = bedroomStatuses.length > 0 && availableCount === 0;
              const underRenovationCount = roomStatuses.filter(r => r.isUnderRenovation).length;
              const isExpanded = expandedProperty === property.id;

              return (
                <Card key={property.id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={property.images?.[0] || "/placeholder.svg"}
                      alt={property.title}
                      className="w-full h-48 object-cover"
                    />
                    {isFullyOccupied ? (
                      <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">Fully Occupied</Badge>
                    ) : (
                      <Badge className="absolute top-2 right-2" variant={property.status === 'available' ? 'default' : 'secondary'}>
                        {property.status}
                      </Badge>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{property.title}</CardTitle>
                        <p className="text-sm text-muted-foreground">{property.location}</p>
                      </div>
                      <div className="text-xl font-bold text-primary">R{property.rent_amount.toLocaleString()}/mo</div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Room Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold text-foreground">{bedroomStatuses.length}</div>
                        <div className="text-xs text-muted-foreground">Bedrooms</div>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{occupiedCount}</div>
                        <div className="text-xs text-muted-foreground">Occupied</div>
                      </div>
                      <div className="text-center p-3 bg-orange-500/10 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">{availableCount}</div>
                        <div className="text-xs text-muted-foreground">Available</div>
                      </div>
                    </div>

                    {underRenovationCount > 0 && (
                      <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg">
                        <Hammer className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-600">{underRenovationCount} space(s) under renovation</span>
                      </div>
                    )}

                    {/* Expandable Details */}
                    <Collapsible open={isExpanded} onOpenChange={() => setExpandedProperty(isExpanded ? null : property.id)}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full">
                          {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                          {isExpanded ? "Hide Details" : "View Spaces & Renovations"}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 mt-4">
                        {/* Bedroom Cards */}
                        <div className="space-y-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            Bedrooms
                          </h4>
                          {bedroomStatuses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No bedrooms configured</p>
                          ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {bedroomStatuses.map((room) => (
                                <div
                                  key={room.id}
                                  className={`p-3 rounded-lg border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
                                    room.isUnderRenovation
                                      ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700'
                                      : room.isFull
                                        ? 'bg-destructive/10 border-destructive/30'
                                        : room.current_occupants > 0
                                          ? 'bg-green-50 border-green-300 dark:bg-green-950/30 dark:border-green-700'
                                          : 'bg-muted border-border'
                                  }`}
                                  onClick={() => navigate(`/space/${room.id}`)}
                                  title="Click to manage furniture & details"
                                >
                                  <div className="font-medium text-foreground">{room.room_number}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {room.current_occupants}/{room.capacity} occupied
                                  </div>
                                  <div className="mt-1">
                                    {room.isUnderRenovation ? (
                                      <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-100 dark:bg-orange-900/50">
                                        Under Renovation
                                      </Badge>
                                    ) : room.isFull ? (
                                      <Badge variant="destructive" className="text-xs">Full</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs border-green-400 text-green-600 bg-green-100 dark:bg-green-900/50">
                                        Available
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Shared Space Cards */}
                        {sharedStatuses.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Shared Spaces
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {sharedStatuses.map((space) => (
                                <div
                                  key={space.id}
                                  className={`p-3 rounded-lg border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all ${
                                    space.isUnderRenovation
                                      ? 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700'
                                      : 'bg-muted border-border'
                                  }`}
                                  onClick={() => navigate(`/space/${space.id}`)}
                                  title="Click to manage furniture & details"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span>{getSpaceTypeIcon(space.type)}</span>
                                    <span className="font-medium text-foreground text-sm">{space.room_number}</span>
                                  </div>
                                  <Badge variant="secondary" className="text-xs mt-1">{getSpaceTypeLabel(space.type)}</Badge>
                                  {space.gender_tag && (
                                    <Badge variant="outline" className="text-xs mt-1 ml-1">{space.gender_tag}</Badge>
                                  )}
                                  {space.isUnderRenovation && (
                                    <Badge variant="outline" className="text-xs mt-1 border-orange-400 text-orange-600 bg-orange-100 dark:bg-orange-900/50">
                                      Under Renovation
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Renovations Section */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Hammer className="h-4 w-4" />
                              Renovations
                            </h4>
                            <Button size="sm" variant="outline" onClick={() => openRenovationDialog(property.id)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                          
                          {propertyRenovations.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No renovations scheduled</p>
                          ) : (
                            <div className="space-y-2">
                              {propertyRenovations.map((renovation) => (
                                <div key={renovation.id} className="p-3 bg-muted rounded-lg">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <div className="font-medium">{renovation.title}</div>
                                      {renovation.room_number && (
                                        <div className="text-xs text-muted-foreground">{renovation.room_number}</div>
                                      )}
                                      {renovation.description && (
                                        <div className="text-sm text-muted-foreground">{renovation.description}</div>
                                      )}
                                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        {(renovation.start_date || renovation.end_date) && (
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {renovation.start_date && new Date(renovation.start_date).toLocaleDateString()}
                                            {renovation.start_date && renovation.end_date && " - "}
                                            {renovation.end_date && new Date(renovation.end_date).toLocaleDateString()}
                                          </span>
                                        )}
                                        {renovation.estimated_cost && (
                                          <span className="flex items-center gap-1">
                                            <DollarSign className="h-3 w-3" />
                                            R{renovation.estimated_cost.toLocaleString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Badge className={statusColors[renovation.status] || statusColors.planned}>
                                      {statusLabels[renovation.status] || renovation.status}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Select value={renovation.status} onValueChange={(v) => handleRenovationStatusChange(renovation.id, v)}>
                                      <SelectTrigger className="h-8 w-[120px] text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="planned">Planned</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRenovationDialog(property.id, renovation)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteRenovation(renovation.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button className="flex-1" variant="outline" onClick={() => navigate(`/edit-property/${property.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => { setDeleteId(property.id); setDeleteConfirmText(""); setDeleteError(""); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Property Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteConfirmText(""); setDeleteError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Property
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this property? This action cannot be undone. Type <span className="font-bold text-foreground">DELETE</span> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(""); }}
              placeholder="Type DELETE to confirm"
            />
            {deleteError && <p className="text-sm text-destructive font-medium">{deleteError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteId(null); setDeleteConfirmText(""); setDeleteError(""); }}>Cancel</Button>
            <Button variant="destructive" disabled={deleteConfirmText !== "DELETE"} onClick={handleDelete}>
              Delete Property
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renovation Dialog */}
      <Dialog open={renovationDialogOpen} onOpenChange={setRenovationDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRenovation ? "Edit Renovation" : "Add New Renovation"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Space</Label>
              <Select value={renovationForm.room_number} onValueChange={(v) => setRenovationForm(prev => ({ ...prev, room_number: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a space (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General (No specific space)</SelectItem>
                  {getSelectedPropertyRooms().map((room) => (
                    <SelectItem key={room.id} value={room.room_number}>
                      {room.room_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g., Bathroom Renovation"
                value={renovationForm.title}
                onChange={(e) => setRenovationForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the renovation work..."
                value={renovationForm.description}
                onChange={(e) => setRenovationForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={renovationForm.status} onValueChange={(v) => setRenovationForm(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={renovationForm.start_date} onChange={(e) => setRenovationForm(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={renovationForm.end_date} onChange={(e) => setRenovationForm(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estimated Cost (R)</Label>
              <Input type="number" placeholder="0.00" value={renovationForm.estimated_cost} onChange={(e) => setRenovationForm(prev => ({ ...prev, estimated_cost: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenovationDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenovationSubmit}>{editingRenovation ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
