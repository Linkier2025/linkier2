import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, Plus, Loader2, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { FURNITURE_ITEMS } from "@/components/RoomFurnitureManager";

interface Complaint {
  id: string;
  title: string;
  description: string;
  student_id: string;
  property_id: string;
  room_id: string | null;
  landlord_id: string | null;
  status: string;
  priority: string;
  created_at: string;
  tenant_name?: string;
  property_title?: string;
  room_number?: string;
}

interface TenantAssignment {
  assignment_id: string;
  room_id: string;
  room_number: string;
  property_id: string;
  property_title: string;
  landlord_id: string;
}

export default function Complaints() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tenantAssignment, setTenantAssignment] = useState<TenantAssignment | null>(null);
  const [roomFurniture, setRoomFurniture] = useState<string[]>([]);
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    related_item: ""
  });

  const isStudent = profile?.user_type === "student";

  // Fetch tenant's active assignment (for students)
  useEffect(() => {
    const fetchAssignment = async () => {
      if (!user || !isStudent) return;

      const { data } = await supabase
        .from('room_assignments')
        .select(`
          id,
          room_id,
          rooms (
            room_number,
            property_id,
            properties (
              id,
              title,
              landlord_id
            )
          )
        `)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data) {
        const room = data.rooms as any;
        const property = room?.properties;
        setTenantAssignment({
          assignment_id: data.id,
          room_id: data.room_id,
          room_number: room?.room_number || '',
          property_id: property?.id || '',
          property_title: property?.title || '',
          landlord_id: property?.landlord_id || ''
        });

        // Fetch furniture items for this room
        const { data: furnitureData } = await (supabase
          .from("room_furniture" as any)
          .select("item_name")
          .eq("room_id", data.room_id) as any);
        if (furnitureData) {
          setRoomFurniture(furnitureData.map((f: any) => f.item_name));
        }
      }
    };

    fetchAssignment();
  }, [user, isStudent]);

  // Fetch complaints
  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user) return;
      setLoading(true);

      try {
        let query = supabase
          .from('complaints')
          .select(`*, properties(title)`)
          .order('created_at', { ascending: false });

        if (isStudent) {
          query = query.eq('student_id', user.id);
        }
        // Landlord filtering is handled by RLS (landlord_id = auth.uid())

        const { data, error } = await query;
        if (error) throw error;

        if (isStudent) {
          setComplaints(
            (data || []).map(c => ({
              id: c.id,
              title: c.title,
              description: c.description,
              student_id: c.student_id,
              property_id: c.property_id,
              room_id: c.room_id,
              landlord_id: c.landlord_id,
              status: c.status,
              priority: c.priority,
              created_at: c.created_at,
              property_title: (c.properties as any)?.title
            }))
          );
        } else {
          // For landlord, fetch student names
          const complaintsWithNames = await Promise.all(
            (data || []).map(async (c) => {
              const { data: sp } = await supabase
                .from('profiles')
                .select('first_name, surname')
                .eq('user_id', c.student_id)
                .maybeSingle();

              // Get room number
              let roomNumber = '';
              if (c.room_id) {
                const { data: room } = await supabase
                  .from('rooms')
                  .select('room_number')
                  .eq('id', c.room_id)
                  .maybeSingle();
                roomNumber = room?.room_number || '';
              }

              return {
                id: c.id,
                title: c.title,
                description: c.description,
                student_id: c.student_id,
                property_id: c.property_id,
                room_id: c.room_id,
                landlord_id: c.landlord_id,
                status: c.status,
                priority: c.priority,
                created_at: c.created_at,
                tenant_name: sp ? `${sp.first_name} ${sp.surname}` : 'Unknown',
                property_title: (c.properties as any)?.title,
                room_number: roomNumber
              };
            })
          );
          setComplaints(complaintsWithNames);
        }
      } catch (error) {
        console.error('Error fetching complaints:', error);
        toast({ title: "Error", description: "Failed to load complaints", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [user, isStudent]);

  const handleSubmitComplaint = async () => {
    if (!complaintForm.title || !complaintForm.description) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (!user || !tenantAssignment) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          student_id: user.id,
          property_id: tenantAssignment.property_id,
          room_id: tenantAssignment.room_id,
          landlord_id: tenantAssignment.landlord_id,
          title: complaintForm.title,
          description: complaintForm.description,
          priority: complaintForm.priority,
          status: 'pending'
        })
        .select(`*, properties(title)`)
        .single();

      if (error) throw error;

      setComplaints(prev => [{
        id: data.id,
        title: data.title,
        description: data.description,
        student_id: data.student_id,
        property_id: data.property_id,
        room_id: data.room_id,
        landlord_id: data.landlord_id,
        status: data.status,
        priority: data.priority,
        created_at: data.created_at,
        property_title: (data.properties as any)?.title
      }, ...prev]);

      toast({ title: "Complaint submitted successfully", description: "Your landlord has been notified." });
      setComplaintForm({ title: "", description: "", priority: "medium", related_item: "" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast({ title: "Error", description: "Failed to submit complaint", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resolveComplaint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: 'resolved' })
        .eq('id', id);
      if (error) throw error;

      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c));
      toast({ title: "Complaint resolved", description: "The complaint has been marked as resolved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update complaint", variant: "destructive" });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'resolved'
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-muted text-muted-foreground border-border';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            {isStudent ? "My Complaints" : "Complaints"}
          </h1>
          {isStudent && tenantAssignment && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Report Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report an Issue</DialogTitle>
                  <DialogDescription>
                    {tenantAssignment.property_title} — Room {tenantAssignment.room_number}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="e.g. Broken window"
                      value={complaintForm.title}
                      onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the issue in detail..."
                      value={complaintForm.description}
                      onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={complaintForm.priority}
                      onValueChange={(v) => setComplaintForm({ ...complaintForm, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmitComplaint} disabled={submitting}>
                    {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Submit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* No active rental message for students */}
        {isStudent && !tenantAssignment && (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">You need an active room to submit complaints.</p>
            </CardContent>
          </Card>
        )}

        {/* Complaints List */}
        {complaints.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No complaints yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{c.title}</h3>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getPriorityColor(c.priority)}`}>
                        {c.priority}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{c.description}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex gap-3">
                      {!isStudent && c.tenant_name && <span>Tenant: {c.tenant_name}</span>}
                      {!isStudent && c.room_number && <span>Room: {c.room_number}</span>}
                      {c.property_title && <span>{c.property_title}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(c.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Resolve button for both landlord and student */}
                  {c.status === 'pending' && (
                    <Button size="sm" onClick={() => resolveComplaint(c.id)}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Resolved
                    </Button>
                  )}

                  {c.status === 'resolved' && (
                    <div className="flex items-center gap-1.5 text-green-600 text-xs">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Resolved
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
