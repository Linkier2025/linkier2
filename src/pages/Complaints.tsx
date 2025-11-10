import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, Plus, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Complaint {
  id: string;
  title: string;
  description: string;
  student_id: string;
  property_id: string;
  status: "pending" | "in-progress" | "resolved";
  created_at: string;
  priority: "low" | "medium" | "high";
  tenant_name?: string;
  property_title?: string;
}

export default function Complaints() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "resolved">("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [userProperties, setUserProperties] = useState<any[]>([]);
  const [complaintForm, setComplaintForm] = useState({
    title: "",
    description: "",
    priority: "medium"
  });

  // Fetch user's rentals to get their properties (for students)
  useEffect(() => {
    const fetchUserProperties = async () => {
      if (!user || profile?.user_type !== "student") return;

      const { data, error } = await supabase
        .from('rentals')
        .select('property_id, properties(id, title)')
        .eq('student_id', user.id)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching properties:', error);
        return;
      }

      if (data) {
        setUserProperties(data.map(r => r.properties).filter(Boolean));
        if (data.length > 0 && data[0].properties) {
          setSelectedProperty(data[0].properties.id);
        }
      }
    };

    fetchUserProperties();
  }, [user, profile]);

  // Fetch complaints
  useEffect(() => {
    const fetchComplaints = async () => {
      if (!user) return;

      setLoading(true);
      try {
        if (profile?.user_type === "student") {
          // Fetch student's own complaints with property details
          const { data, error } = await supabase
            .from('complaints')
            .select(`
              *,
              properties(title)
            `)
            .eq('student_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const formattedComplaints: Complaint[] = data?.map(c => ({
            id: c.id,
            title: c.title,
            description: c.description,
            student_id: c.student_id,
            property_id: c.property_id,
            status: c.status as "pending" | "in-progress" | "resolved",
            priority: c.priority as "low" | "medium" | "high",
            created_at: c.created_at,
            property_title: (c.properties as any)?.title
          })) || [];

          setComplaints(formattedComplaints);
        } else {
          // Fetch complaints for landlord's properties with student details
          const { data, error } = await supabase
            .from('complaints')
            .select(`
              *,
              properties(title, landlord_id)
            `)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // For each complaint, fetch the student profile
          const complaintsWithDetails = await Promise.all(
            data?.map(async (c) => {
              const { data: studentProfile } = await supabase
                .from('profiles')
                .select('first_name, surname')
                .eq('user_id', c.student_id)
                .maybeSingle();

              return {
                id: c.id,
                title: c.title,
                description: c.description,
                student_id: c.student_id,
                property_id: c.property_id,
                status: c.status as "pending" | "in-progress" | "resolved",
                priority: c.priority as "low" | "medium" | "high",
                created_at: c.created_at,
                tenant_name: studentProfile ? `${studentProfile.first_name} ${studentProfile.surname}` : 'Unknown',
                property_title: (c.properties as any)?.title,
                landlord_id: (c.properties as any)?.landlord_id
              };
            }) || []
          );

          // Filter only complaints for this landlord's properties
          const landlordComplaints = complaintsWithDetails.filter(
            c => c.landlord_id === user.id
          );

          setComplaints(landlordComplaints);
        }
      } catch (error) {
        console.error('Error fetching complaints:', error);
        toast({
          title: "Error",
          description: "Failed to load complaints",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchComplaints();
  }, [user, profile]);

  const updateComplaintStatus = async (complaintId: string, newStatus: Complaint["status"]) => {
    try {
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', complaintId);

      if (error) throw error;

      setComplaints(complaints.map(complaint =>
        complaint.id === complaintId
          ? { ...complaint, status: newStatus }
          : complaint
      ));
      
      toast({
        title: "Status updated",
        description: `Complaint status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint status",
        variant: "destructive",
      });
    }
  };

  const filteredComplaints = complaints.filter(complaint =>
    filter === "all" || complaint.status === filter
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "secondary",
      "in-progress": "default",
      resolved: "outline"
    } as const;
    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: "outline",
      medium: "secondary", 
      high: "destructive"
    } as const;
    return <Badge variant={variants[priority as keyof typeof variants]}>{priority} priority</Badge>;
  };

  const handleSubmitComplaint = async () => {
    if (!complaintForm.title || !complaintForm.description || !selectedProperty) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('complaints')
        .insert({
          student_id: user.id,
          property_id: selectedProperty,
          title: complaintForm.title,
          description: complaintForm.description,
          priority: complaintForm.priority,
          status: 'pending'
        })
        .select(`
          *,
          properties(title)
        `)
        .single();

      if (error) throw error;

      const newComplaint: Complaint = {
        id: data.id,
        title: data.title,
        description: data.description,
        student_id: data.student_id,
        property_id: data.property_id,
        status: data.status as "pending" | "in-progress" | "resolved",
        priority: data.priority as "low" | "medium" | "high",
        created_at: data.created_at,
        property_title: (data.properties as any)?.title
      };

      setComplaints([newComplaint, ...complaints]);
      toast({
        title: "Complaint Submitted",
        description: "Your complaint has been submitted successfully.",
      });

      setComplaintForm({ title: "", description: "", priority: "medium" });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast({
        title: "Error",
        description: "Failed to submit complaint",
        variant: "destructive",
      });
    }
  };

  // Student view
  if (profile?.user_type === "student") {
    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/student-dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">My Complaints</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Complaint
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit a Complaint</DialogTitle>
                  <DialogDescription>
                    Describe your issue and we'll notify your landlord
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="Brief description of the issue"
                      value={complaintForm.title}
                      onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="property">Property</Label>
                    <Select
                      value={selectedProperty}
                      onValueChange={setSelectedProperty}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a property" />
                      </SelectTrigger>
                      <SelectContent>
                        {userProperties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed description of the issue"
                      value={complaintForm.description}
                      onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={complaintForm.priority}
                      onValueChange={(value) => setComplaintForm({ ...complaintForm, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low Priority</SelectItem>
                        <SelectItem value="medium">Medium Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitComplaint}>Submit</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Complaints List */}
          <div className="grid gap-4">
            {complaints.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't submitted any complaints yet.</p>
                  {userProperties.length > 0 ? (
                    <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Submit Your First Complaint
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      You need to have an active rental to submit complaints.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              complaints.map((complaint) => (
                <Card key={complaint.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-lg">{complaint.title}</CardTitle>
                        <div className="flex gap-2">
                          {getStatusBadge(complaint.status)}
                          {getPriorityBadge(complaint.priority)}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {new Date(complaint.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{complaint.description}</p>
                    
                    <div className="text-sm">
                      <strong>Property:</strong> {complaint.property_title || 'Unknown'}
                    </div>

                    {complaint.status === "resolved" && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">This complaint has been resolved</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Landlord view
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/landlord-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Complaints Management</h1>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Complaints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {["all", "pending", "in-progress", "resolved"].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "outline"}
                  onClick={() => setFilter(status as typeof filter)}
                  className="capitalize"
                >
                  {status === "all" ? "All Complaints" : status.replace("-", " ")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Complaints List */}
        <div className="grid gap-4">
          {filteredComplaints.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No complaints found.</p>
              </CardContent>
            </Card>
          ) : (
            filteredComplaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-lg">{complaint.title}</CardTitle>
                      <div className="flex gap-2">
                        {getStatusBadge(complaint.status)}
                        {getPriorityBadge(complaint.priority)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {new Date(complaint.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{complaint.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Tenant:</strong> {complaint.tenant_name || 'Unknown'}
                    </div>
                    <div>
                      <strong>Property:</strong> {complaint.property_title || 'Unknown'}
                    </div>
                  </div>

                  {complaint.status !== "resolved" && (
                    <div className="flex gap-2 pt-4">
                      {complaint.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => updateComplaintStatus(complaint.id, "in-progress")}
                        >
                          Start Working
                        </Button>
                      )}
                      {complaint.status === "in-progress" && (
                        <Button
                          size="sm"
                          onClick={() => updateComplaintStatus(complaint.id, "resolved")}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Resolved
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}