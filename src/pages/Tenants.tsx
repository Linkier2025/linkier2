import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, User, CheckCircle, Home, Users, MessageCircle, DollarSign, LogOut as LogOutIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactOptionsSheet } from "@/components/ContactOptionsSheet";
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
  gender: string | null;
  university: string | null;
  year_of_study: string | null;
}

interface ActiveTenant {
  assignment_id: string;
  student_id: string;
  room_number: string;
  room_id: string;
  property_id: string;
  property_title: string;
  payment_status: string;
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
  const [roomOccupancies, setRoomOccupancies] = useState<RoomOccupancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: 'payment' | 'moveout'; tenant: ActiveTenant | null; newStatus?: string }>({
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
      const { data: assignmentsData, error: assignmentsError } = await (supabase
        .from('room_assignments')
        .select(`
          id,
          room_id,
          student_id,
          status,
          payment_status,
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
        .eq('status', 'active')
        .order('created_at', { ascending: false }) as any);

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
          .select('user_id, first_name, surname, email, phone, avatar_url, gender, university, year_of_study')
          .in('user_id', studentIds as string[]);

        if (studentsData) {
          studentsData.forEach((s) => {
            studentsMap.set(s.user_id, {
              first_name: s.first_name,
              surname: s.surname,
              email: s.email,
              phone: s.phone,
              avatar_url: s.avatar_url,
              gender: s.gender,
              university: s.university,
              year_of_study: s.year_of_study,
            });
          });
        }
      }

      // Group by room
      const activeByRoom = new Map<string, RoomOccupancy>();

      landlordAssignments.forEach((assignment: any) => {
        const room = assignment.rooms;
        const property = room.properties;
        const student = studentsMap.get(assignment.student_id) || null;

        const tenant: ActiveTenant = {
          assignment_id: assignment.id,
          student_id: assignment.student_id,
          room_number: room.room_number,
          room_id: room.id,
          property_id: property.id,
          property_title: property.title,
          payment_status: assignment.payment_status || 'unpaid',
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
      });

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

  const handleTogglePayment = async () => {
    if (!confirmDialog.tenant || !confirmDialog.newStatus) return;
    setProcessing(true);

    try {
      const { error } = await (supabase.rpc as any)('toggle_payment_status', {
        p_assignment_id: confirmDialog.tenant.assignment_id,
        p_status: confirmDialog.newStatus,
      });

      if (error) throw error;

      toast({
        title: "Payment Status Updated",
        description: `Status changed to ${confirmDialog.newStatus}.`,
      });
      setConfirmDialog({ open: false, type: 'payment', tenant: null });
      fetchTenants();
    } catch (error: any) {
      console.error('Error toggling payment:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMoveOut = async () => {
    if (!confirmDialog.tenant) return;
    setProcessing(true);

    try {
      const { error } = await (supabase.rpc as any)('move_out_tenant', {
        p_assignment_id: confirmDialog.tenant.assignment_id,
      });

      if (error) throw error;

      toast({
        title: "Tenant Moved Out",
        description: "The room space is now available again.",
      });
      setConfirmDialog({ open: false, type: 'moveout', tenant: null });
      fetchTenants();
    } catch (error: any) {
      console.error('Error moving out tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process move-out",
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

  const totalTenants = roomOccupancies.reduce((acc, room) => acc + room.tenants.length, 0);

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">My Tenants</h1>
          <Badge variant="secondary">{totalTenants} active</Badge>
        </div>

        {roomOccupancies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No active tenants yet</p>
              <p className="text-sm">Approved room requests will appear here.</p>
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
                       className="p-3 bg-muted/50 rounded-lg space-y-2"
                      >
                       <div className="flex items-start gap-3">
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={tenant.student?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{getStudentInitials(tenant.student)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">{getStudentName(tenant.student)}</p>
                              <Badge 
                                variant={tenant.payment_status === 'paid' ? 'default' : 'destructive'}
                                className={`shrink-0 text-[10px] ${tenant.payment_status === 'paid' ? 'bg-green-600' : ''}`}
                              >
                                <DollarSign className="h-3 w-3 mr-0.5" />
                                {tenant.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground mt-0.5">
                              {tenant.student?.phone && <span>{tenant.student.phone}</span>}
                              {tenant.student?.gender && <span>• {tenant.student.gender}</span>}
                            </div>
                            {tenant.student?.university && (
                              <p className="text-[11px] text-muted-foreground">
                                {tenant.student.university}{tenant.student?.year_of_study ? ` - ${tenant.student.year_of_study}` : ''}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Button
                            size="sm"
                            variant={tenant.payment_status === 'paid' ? 'outline' : 'default'}
                            className={`h-7 text-xs ${tenant.payment_status !== 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => setConfirmDialog({
                              open: true,
                              type: 'payment',
                              tenant,
                              newStatus: tenant.payment_status === 'paid' ? 'unpaid' : 'paid',
                            })}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            {tenant.payment_status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                          </Button>

                          <ContactOptionsSheet
                            phone={tenant.student?.phone}
                            email={tenant.student?.email}
                            name={getStudentName(tenant.student)}
                            trigger={
                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                <MessageCircle className="h-3 w-3 mr-1" />
                                Contact
                              </Button>
                            }
                          />

                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => setConfirmDialog({
                              open: true,
                              type: 'moveout',
                              tenant,
                            })}
                          >
                            <LogOutIcon className="h-3 w-3 mr-1" />
                            Move Out
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === 'payment' ? 'Update Payment Status' : 'Confirm Move-Out'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDialog.type === 'payment'
                  ? `Mark ${getStudentName(confirmDialog.tenant?.student || null)} as "${confirmDialog.newStatus}"?`
                  : `Are you sure you want to move out ${getStudentName(confirmDialog.tenant?.student || null)}? The room space will become available again.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDialog.type === 'payment' ? handleTogglePayment : handleMoveOut}
                disabled={processing}
                className={confirmDialog.type === 'moveout' ? 'bg-destructive hover:bg-destructive/90' : ''}
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
