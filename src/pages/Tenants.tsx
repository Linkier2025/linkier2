import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Phone, User, CreditCard, CheckCircle, XCircle, Home, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudentProfile {
  first_name: string | null;
  surname: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface ReservedTenant {
  assignment_id: string;
  student_id: string;
  room_number: string;
  property_id: string;
  property_title: string;
  student: StudentProfile | null;
}

interface ActiveTenant {
  assignment_id: string;
  student_id: string;
  room_number: string;
  room_id: string;
  property_id: string;
  property_title: string;
  student: StudentProfile | null;
}

interface RoomOccupancy {
  room_id: string;
  room_number: string;
  capacity: number;
  property_id: string;
  property_title: string;
  tenants: ActiveTenant[];
}

export default function Tenants() {
  const { user } = useAuth();
  const [reservedTenants, setReservedTenants] = useState<ReservedTenant[]>([]);
  const [roomOccupancies, setRoomOccupancies] = useState<RoomOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'payment' | 'cancel'; tenant: ReservedTenant | null }>({
    open: false,
    type: 'payment',
    tenant: null,
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTenants();
    }
  }, [user]);

  const fetchTenants = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all room assignments for landlord's properties
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('room_assignments')
        .select(`
          id,
          room_id,
          student_id,
          status,
          rooms!inner (
            id,
            room_number,
            capacity,
            property_id,
            properties!inner (
              id,
              title,
              landlord_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Filter to only landlord's properties
      const landlordAssignments = (assignmentsData || []).filter(
        (a: any) => a.rooms.properties.landlord_id === user.id
      );

      // Get unique student IDs
      const studentIds = [...new Set(landlordAssignments.map((a: any) => a.student_id))];

      // Fetch student profiles
      let studentsMap = new Map<string, StudentProfile>();
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname, email, phone, avatar_url')
          .in('user_id', studentIds);

        if (studentsData) {
          studentsData.forEach((s) => {
            studentsMap.set(s.user_id, {
              first_name: s.first_name,
              surname: s.surname,
              email: s.email,
              phone: s.phone,
              avatar_url: s.avatar_url,
            });
          });
        }
      }

      // Separate reserved and active tenants
      const reserved: ReservedTenant[] = [];
      const activeByRoom = new Map<string, RoomOccupancy>();

      landlordAssignments.forEach((assignment: any) => {
        const room = assignment.rooms;
        const property = room.properties;
        const student = studentsMap.get(assignment.student_id) || null;

        if (assignment.status === 'reserved') {
          reserved.push({
            assignment_id: assignment.id,
            student_id: assignment.student_id,
            room_number: room.room_number,
            property_id: property.id,
            property_title: property.title,
            student,
          });
        } else if (assignment.status === 'active') {
          const tenant: ActiveTenant = {
            assignment_id: assignment.id,
            student_id: assignment.student_id,
            room_number: room.room_number,
            room_id: room.id,
            property_id: property.id,
            property_title: property.title,
            student,
          };

          if (!activeByRoom.has(room.id)) {
            activeByRoom.set(room.id, {
              room_id: room.id,
              room_number: room.room_number,
              capacity: room.capacity,
              property_id: property.id,
              property_title: property.title,
              tenants: [],
            });
          }
          activeByRoom.get(room.id)!.tenants.push(tenant);
        }
      });

      setReservedTenants(reserved);
      setRoomOccupancies(Array.from(activeByRoom.values()));
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: "Error",
        description: "Failed to load tenants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirmDialog.tenant) return;
    setProcessing(true);

    try {
      const { error } = await supabase.rpc('confirm_payment', {
        p_assignment_id: confirmDialog.tenant.assignment_id,
      });

      if (error) throw error;

      toast({
        title: "Payment Confirmed",
        description: "The tenant is now active.",
      });
      setConfirmDialog({ open: false, type: 'payment', tenant: null });
      fetchTenants();
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to confirm payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!confirmDialog.tenant) return;
    setProcessing(true);

    try {
      const { error } = await supabase.rpc('cancel_reservation', {
        p_assignment_id: confirmDialog.tenant.assignment_id,
      });

      if (error) throw error;

      toast({
        title: "Reservation Cancelled",
        description: "The room is now available again.",
      });
      setConfirmDialog({ open: false, type: 'cancel', tenant: null });
      fetchTenants();
    } catch (error: any) {
      console.error('Error cancelling reservation:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to cancel reservation",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStudentName = (student: StudentProfile | null) => {
    if (!student) return 'Unknown Student';
    return `${student.first_name || ''} ${student.surname || ''}`.trim() || 'Unknown Student';
  };

  const getStudentInitials = (student: StudentProfile | null) => {
    if (!student) return '?';
    const first = student.first_name?.[0] || '';
    const last = student.surname?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/landlord-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Tenants</h1>
        </div>

        {/* Reserved Tenants Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-600" />
            <h2 className="text-xl font-semibold">Reserved (Awaiting Payment)</h2>
            <Badge variant="secondary">{reservedTenants.length}</Badge>
          </div>

          {reservedTenants.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No students awaiting payment confirmation.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reservedTenants.map((tenant) => (
                <Card key={tenant.assignment_id} className="border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={tenant.student?.avatar_url || undefined} />
                        <AvatarFallback>{getStudentInitials(tenant.student)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{getStudentName(tenant.student)}</h3>
                        <p className="text-sm text-muted-foreground">{tenant.property_title}</p>
                        <Badge variant="outline" className="mt-1">Room {tenant.room_number}</Badge>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Not Paid
                      </Badge>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {tenant.student?.phone && (
                        <a href={`tel:${tenant.student.phone}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        </a>
                      )}
                      {tenant.student?.email && (
                        <a href={`mailto:${tenant.student.email}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            <Mail className="h-4 w-4 mr-2" />
                            Email
                          </Button>
                        </a>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setConfirmDialog({ open: true, type: 'payment', tenant })}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Paid
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setConfirmDialog({ open: true, type: 'cancel', tenant })}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Active Tenants Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-semibold">Active Tenants</h2>
            <Badge variant="secondary">
              {roomOccupancies.reduce((acc, room) => acc + room.tenants.length, 0)}
            </Badge>
          </div>

          {roomOccupancies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No active tenants yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {roomOccupancies.map((room) => (
                <Card key={room.room_id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{room.property_title}</CardTitle>
                          <p className="text-sm text-muted-foreground">Room {room.room_number}</p>
                        </div>
                      </div>
                      <Badge 
                        variant={room.tenants.length >= room.capacity ? "default" : "secondary"}
                        className={room.tenants.length >= room.capacity ? "bg-green-600" : ""}
                      >
                        {room.tenants.length}/{room.capacity} occupied
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {room.tenants.map((tenant) => (
                        <div
                          key={tenant.assignment_id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={tenant.student?.avatar_url || undefined} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{getStudentName(tenant.student)}</p>
                              <p className="text-sm text-muted-foreground">{tenant.student?.email}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {tenant.student?.phone && (
                              <a href={`tel:${tenant.student.phone}`}>
                                <Button variant="ghost" size="icon">
                                  <Phone className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                            {tenant.student?.email && (
                              <a href={`mailto:${tenant.student.email}`}>
                                <Button variant="ghost" size="icon">
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === 'payment' ? 'Confirm Payment' : 'Cancel Reservation'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.type === 'payment'
                  ? `Are you sure you want to mark ${getStudentName(confirmDialog.tenant?.student || null)} as paid? They will become an active tenant.`
                  : `Are you sure you want to cancel the reservation for ${getStudentName(confirmDialog.tenant?.student || null)}? The room will become available again.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDialog.type === 'payment' ? handleConfirmPayment : handleCancelReservation}
                disabled={processing}
                className={confirmDialog.type === 'payment' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {processing ? 'Processing...' : 'Confirm'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
