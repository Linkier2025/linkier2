import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

interface ViewingRequest {
  id: string;
  property_id: string;
  student_id: string;
  landlord_id: string;
  status: string;
  requested_at: string;
  scheduled_date: string | null;
  student_message: string | null;
  landlord_notes: string | null;
  property: {
    title: string;
    location: string;
  };
  student?: {
    first_name: string;
    surname: string;
    phone: string;
    email: string;
  };
}

export default function ViewingRequests() {
  const { user, profile } = useAuth();
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<ViewingRequest | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [landlordNotes, setLandlordNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const isLandlord = profile?.user_type === 'landlord';

  useEffect(() => {
    fetchViewings();
  }, [user, isLandlord]);

  const fetchViewings = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('property_viewings')
        .select(`
          *,
          property:properties(title, location)
        `)
        .order('requested_at', { ascending: false });

      if (isLandlord) {
        query = query.eq('landlord_id', user.id);
        
        // Fetch student details for landlords
        const { data: viewingsData, error: viewingsError } = await query;
        if (viewingsError) throw viewingsError;

        // Fetch student profiles
        const studentIds = [...new Set(viewingsData?.map(v => v.student_id) || [])];
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname, phone, email')
          .in('user_id', studentIds);

        const viewingsWithStudents = viewingsData?.map(viewing => ({
          ...viewing,
          student: studentsData?.find(s => s.user_id === viewing.student_id)
        })) || [];

        setViewings(viewingsWithStudents);
      } else {
        query = query.eq('student_id', user.id);
        const { data, error } = await query;
        if (error) throw error;
        setViewings(data || []);
      }
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast({
        title: "Error",
        description: "Failed to load viewing requests.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleViewing = async () => {
    if (!selectedViewing || !scheduledDate) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({
          status: 'scheduled',
          scheduled_date: scheduledDate,
          landlord_notes: landlordNotes
        })
        .eq('id', selectedViewing.id);

      if (error) throw error;

      toast({
        title: "Viewing scheduled!",
        description: "The student has been notified of the viewing time.",
      });
      setScheduleDialogOpen(false);
      setSelectedViewing(null);
      setScheduledDate("");
      setLandlordNotes("");
      fetchViewings();
    } catch (error) {
      console.error('Error scheduling viewing:', error);
      toast({
        title: "Error",
        description: "Failed to schedule viewing.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkCompleted = async (viewingId: string) => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: 'completed' })
        .eq('id', viewingId);

      if (error) throw error;

      toast({
        title: "Viewing marked as completed",
        description: "The viewing has been marked as completed.",
      });
      fetchViewings();
    } catch (error) {
      console.error('Error marking viewing as completed:', error);
      toast({
        title: "Error",
        description: "Failed to update viewing status.",
        variant: "destructive"
      });
    }
  };

  const handleCancelViewing = async (viewingId: string) => {
    try {
      const { error } = await supabase
        .from('property_viewings')
        .update({ status: 'cancelled' })
        .eq('id', viewingId);

      if (error) throw error;

      toast({
        title: "Viewing cancelled",
        description: "The viewing request has been cancelled.",
      });
      fetchViewings();
    } catch (error) {
      console.error('Error cancelling viewing:', error);
      toast({
        title: "Error",
        description: "Failed to cancel viewing.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      scheduled: "default",
      completed: "outline",
      cancelled: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to={isLandlord ? "/landlord-dashboard" : "/student-dashboard"}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {isLandlord ? "Property Viewing Requests" : "My Viewing Requests"}
          </h1>
        </div>

        {viewings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No viewing requests</h3>
              <p className="text-muted-foreground">
                {isLandlord
                  ? "You haven't received any viewing requests yet."
                  : "You haven't requested any property viewings yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {viewings.map((viewing) => (
              <Card key={viewing.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{viewing.property.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {viewing.property.location}
                      </div>
                      {isLandlord && viewing.student && (
                        <div className="mt-2 text-sm">
                          <p className="font-medium">
                            {viewing.student.first_name} {viewing.student.surname}
                          </p>
                          <p className="text-muted-foreground">{viewing.student.email}</p>
                          {viewing.student.phone && (
                            <p className="text-muted-foreground">{viewing.student.phone}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {getStatusBadge(viewing.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Requested: {format(new Date(viewing.requested_at), "PPP")}
                  </div>

                  {viewing.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">
                        Scheduled: {format(new Date(viewing.scheduled_date), "PPP p")}
                      </span>
                    </div>
                  )}

                  {viewing.student_message && (
                    <div>
                      <p className="text-sm font-medium mb-1">Student's message:</p>
                      <p className="text-sm text-muted-foreground">{viewing.student_message}</p>
                    </div>
                  )}

                  {viewing.landlord_notes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Landlord's notes:</p>
                      <p className="text-sm text-muted-foreground">{viewing.landlord_notes}</p>
                    </div>
                  )}

                  {isLandlord && (
                    <div className="flex gap-2 pt-2">
                      {viewing.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedViewing(viewing);
                              setScheduleDialogOpen(true);
                            }}
                          >
                            Schedule Viewing
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelViewing(viewing.id)}
                          >
                            Decline
                          </Button>
                        </>
                      )}
                      {viewing.status === 'scheduled' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkCompleted(viewing.id)}
                        >
                          Mark as Completed
                        </Button>
                      )}
                    </div>
                  )}

                  {!isLandlord && viewing.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelViewing(viewing.id)}
                    >
                      Cancel Request
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Schedule Dialog for Landlords */}
        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Viewing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="scheduled-date">Date and Time</Label>
                <Input
                  id="scheduled-date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="landlord-notes">Notes (optional)</Label>
                <Textarea
                  id="landlord-notes"
                  placeholder="Add any additional information for the student..."
                  value={landlordNotes}
                  onChange={(e) => setLandlordNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button 
                onClick={handleScheduleViewing} 
                className="w-full"
                disabled={!scheduledDate || updating}
              >
                {updating ? "Scheduling..." : "Confirm Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
