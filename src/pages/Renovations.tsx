import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Hammer, Calendar, DollarSign, Edit, Trash2, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Renovation {
  id: string;
  property_id: string;
  landlord_id: string;
  room_number: string | null;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  estimated_cost: number | null;
  created_at: string;
  property?: {
    title: string;
  };
}

interface Property {
  id: string;
  title: string;
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

const Renovations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [renovations, setRenovations] = useState<Renovation[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRenovation, setEditingRenovation] = useState<Renovation | null>(null);
  const [formData, setFormData] = useState({
    property_id: "",
    room_number: "",
    title: "",
    description: "",
    status: "planned",
    start_date: "",
    end_date: "",
    estimated_cost: "",
  });

  useEffect(() => {
    if (user) {
      fetchRenovations();
      fetchProperties();
    }
  }, [user]);

  const fetchRenovations = async () => {
    try {
      const { data, error } = await supabase
        .from('renovations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch property titles separately
      if (data && data.length > 0) {
        const propertyIds = [...new Set(data.map(r => r.property_id))];
        const { data: propertiesData } = await supabase
          .from('properties')
          .select('id, title')
          .in('id', propertyIds);

        const propertyMap = new Map(propertiesData?.map(p => [p.id, p.title]) || []);
        const renovationsWithProperty = data.map(r => ({
          ...r,
          property: { title: propertyMap.get(r.property_id) || 'Unknown Property' }
        }));
        setRenovations(renovationsWithProperty);
      } else {
        setRenovations([]);
      }
    } catch (error) {
      console.error('Error fetching renovations:', error);
      toast({
        title: "Error",
        description: "Failed to load renovations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, title')
        .eq('landlord_id', user?.id);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      property_id: "",
      room_number: "",
      title: "",
      description: "",
      status: "planned",
      start_date: "",
      end_date: "",
      estimated_cost: "",
    });
    setEditingRenovation(null);
  };

  const handleOpenDialog = (renovation?: Renovation) => {
    if (renovation) {
      setEditingRenovation(renovation);
      setFormData({
        property_id: renovation.property_id,
        room_number: renovation.room_number || "",
        title: renovation.title,
        description: renovation.description || "",
        status: renovation.status,
        start_date: renovation.start_date || "",
        end_date: renovation.end_date || "",
        estimated_cost: renovation.estimated_cost?.toString() || "",
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.property_id || !formData.title) {
      toast({
        title: "Missing fields",
        description: "Please fill in property and title",
        variant: "destructive"
      });
      return;
    }

    try {
      const renovationData = {
        property_id: formData.property_id,
        landlord_id: user?.id,
        room_number: formData.room_number || null,
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      };

      if (editingRenovation) {
        const { error } = await supabase
          .from('renovations')
          .update(renovationData)
          .eq('id', editingRenovation.id);

        if (error) throw error;
        toast({ title: "Renovation updated successfully" });
      } else {
        const { error } = await supabase
          .from('renovations')
          .insert(renovationData);

        if (error) throw error;
        toast({ title: "Renovation added successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchRenovations();
    } catch (error: any) {
      console.error('Error saving renovation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save renovation",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('renovations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Renovation deleted" });
      fetchRenovations();
    } catch (error: any) {
      console.error('Error deleting renovation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete renovation",
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('renovations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Status updated" });
      fetchRenovations();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/landlord-dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Room Renovations</h1>
            <p className="text-sm text-muted-foreground">Track and manage property renovations</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Renovation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRenovation ? "Edit Renovation" : "Add New Renovation"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Property *</Label>
                <Select value={formData.property_id} onValueChange={(v) => setFormData(prev => ({ ...prev, property_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  placeholder="e.g., Room 101"
                  value={formData.room_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, room_number: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="e.g., Bathroom Renovation"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the renovation work..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Cost (R)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_cost: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>{editingRenovation ? "Update" : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : renovations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Hammer className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Renovations Yet</h3>
              <p className="text-muted-foreground">Start tracking your property renovations</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {renovations.map((renovation) => (
              <Card key={renovation.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{renovation.title}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Home className="h-4 w-4" />
                        <span>{renovation.property?.title}</span>
                        {renovation.room_number && (
                          <span>• {renovation.room_number}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={statusColors[renovation.status] || statusColors.planned}>
                      {statusLabels[renovation.status] || renovation.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {renovation.description && (
                    <p className="text-sm text-muted-foreground">{renovation.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {(renovation.start_date || renovation.end_date) && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {renovation.start_date && new Date(renovation.start_date).toLocaleDateString()}
                          {renovation.start_date && renovation.end_date && " - "}
                          {renovation.end_date && new Date(renovation.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {renovation.estimated_cost && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>R{renovation.estimated_cost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Select
                      value={renovation.status}
                      onValueChange={(v) => handleStatusChange(renovation.id, v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planned">Planned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => handleOpenDialog(renovation)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => handleDelete(renovation.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

export default Renovations;
