import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Home, Users, MessageCircle, DollarSign, LogOut as LogOutIcon, Moon, Sun, ArrowLeft } from "lucide-react";
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
  status: string;
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

type DialogType = 'payment' | 'moveout' | 'toggle_status';

export default function Tenants() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allTenants, setAllTenants] = useState<ActiveTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: DialogType;
    tenant: ActiveTenant | null;
    newStatus?: string;
  }>({ open: false, type: 'payment', tenant: null });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) fetchTenants();
  }, [user]);

  const fetchTenants = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data: assignmentsData, error } = await (supabase
        .from('room_assignments')
        .select(`
          id, room_id, student_id, status, payment_status,
          rooms!inner (id, room_number, capacity, property_id,
            properties!inner (id, title, landlord_id))
        `)
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      const landlordAssignments = (assignmentsData || []).filter(
        (a: any) => a.rooms.properties.landlord_id === user.id
      );

      const studentIds = [...new Set(landlordAssignments.map((a: any) => a.student_id))];
      let studentsMap = new Map<string, StudentProfile>();
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname, email, phone, avatar_url, gender, university, year_of_study')
          .in('user_id', studentIds as string[]);
        studentsData?.forEach((s) => {
          studentsMap.set(s.user_id, {
            first_name: s.first_name, surname: s.surname, email: s.email,
            phone: s.phone, avatar_url: s.avatar_url, gender: s.gender,
            university: s.university, year_of_study: s.year_of_study,
          });
        });
      }

      const tenants: ActiveTenant[] = landlordAssignments.map((a: any) => ({
        assignment_id: a.id,
        student_id: a.student_id,
        room_number: a.rooms.room_number,
        room_id: a.rooms.id,
        property_id: a.rooms.properties.id,
        property_title: a.rooms.properties.title,
        payment_status: a.payment_status || 'unpaid',
        status: a.status,
        student: studentsMap.get(a.student_id) || null,
      }));

      setAllTenants(tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({ title: "Error", description: "Failed to load tenants", variant: "destructive" });
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
      toast({ title: "Payment Status Updated", description: `Status changed to ${confirmDialog.newStatus}.` });
      setConfirmDialog({ open: false, type: 'payment', tenant: null });
      fetchTenants();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update payment status", variant: "destructive" });
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
      toast({ title: "Tenant Moved Out", description: "The room space is now available again." });
      setConfirmDialog({ open: false, type: 'moveout', tenant: null });
      fetchTenants();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to process move-out", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmDialog.tenant || !confirmDialog.newStatus) return;
    setProcessing(true);
    try {
      const { error } = await (supabase.rpc as any)('toggle_tenant_status', {
        p_assignment_id: confirmDialog.tenant.assignment_id,
        p_status: confirmDialog.newStatus,
      });
      if (error) throw error;
      toast({
        title: "Status Updated",
        description: `Tenant marked as ${confirmDialog.newStatus}.`,
      });
      setConfirmDialog({ open: false, type: 'toggle_status', tenant: null });
      fetchTenants();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
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

  const activeTenants = allTenants.filter(t => t.status === 'active');
  const inactiveTenants = allTenants.filter(t => t.status === 'inactive');
  const currentTenants = activeTab === 'active' ? activeTenants : inactiveTenants;

  // Group by room
  const groupByRoom = (tenants: ActiveTenant[]): RoomOccupancy[] => {
    const byRoom = new Map<string, RoomOccupancy>();
    tenants.forEach((tenant) => {
      if (!byRoom.has(tenant.room_id)) {
        byRoom.set(tenant.room_id, {
          room_id: tenant.room_id,
          room_number: tenant.room_number,
          capacity: 0,
          property_id: tenant.property_id,
          property_title: tenant.property_title,
          tenants: [],
        });
      }
      byRoom.get(tenant.room_id)!.tenants.push(tenant);
    });
    return Array.from(byRoom.values());
  };

  const roomOccupancies = groupByRoom(currentTenants);

  const getStatusBadge = (status: string) => {
    if (status === 'active') return <Badge className="bg-green-600 text-white">Active</Badge>;
    if (status === 'inactive') return <Badge className="bg-amber-500 text-white">Inactive</Badge>;
    return <Badge variant="secondary">Moved Out</Badge>;
  };

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

  const renderTenantCard = (tenant: ActiveTenant) => (
    <div key={tenant.assignment_id} className="p-3 bg-muted/50 rounded-lg space-y-2">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={tenant.student?.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{getStudentInitials(tenant.student)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{getStudentName(tenant.student)}</p>
            <div className="flex items-center gap-1 shrink-0">
              {getStatusBadge(tenant.status)}
              <Badge
                variant={tenant.payment_status === 'paid' ? 'default' : 'destructive'}
                className={`text-[10px] ${tenant.payment_status === 'paid' ? 'bg-green-600' : ''}`}
              >
                <DollarSign className="h-3 w-3 mr-0.5" />
                {tenant.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
              </Badge>
            </div>
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
            open: true, type: 'payment', tenant,
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

        {/* Toggle Active/Inactive */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => setConfirmDialog({
            open: true, type: 'toggle_status', tenant,
            newStatus: tenant.status === 'active' ? 'inactive' : 'active',
          })}
        >
          {tenant.status === 'active' ? (
            <><Moon className="h-3 w-3 mr-1" /> Mark Inactive</>
          ) : (
            <><Sun className="h-3 w-3 mr-1" /> Mark Active</>
          )}
        </Button>

        <Button
          size="sm"
          variant="destructive"
          className="h-7 text-xs"
          onClick={() => setConfirmDialog({ open: true, type: 'moveout', tenant })}
        >
          <LogOutIcon className="h-3 w-3 mr-1" />
          Move Out
        </Button>
      </div>
    </div>
  );

  const getDialogMessage = () => {
    const name = getStudentName(confirmDialog.tenant?.student || null);
    if (confirmDialog.type === 'payment') {
      return `Mark ${name} as "${confirmDialog.newStatus}"?`;
    }
    if (confirmDialog.type === 'toggle_status') {
      return `Mark ${name} as "${confirmDialog.newStatus}"? ${
        confirmDialog.newStatus === 'inactive'
          ? 'They will still have access to their stay features.'
          : 'They will be restored to full active status.'
      }`;
    }
    return `Are you sure you want to move out ${name}? They will lose access to all property features and be notified.`;
  };

  const handleConfirm = () => {
    if (confirmDialog.type === 'payment') handleTogglePayment();
    else if (confirmDialog.type === 'toggle_status') handleToggleStatus();
    else handleMoveOut();
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-accent transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold">My Tenants</h1>
          <Badge variant="secondary">{allTenants.length} total</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active ({activeTenants.length})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="flex-1">
              Inactive ({inactiveTenants.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {roomOccupancies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">
                    {activeTab === 'active' ? 'No active tenants' : 'No inactive tenants'}
                  </p>
                  <p className="text-sm">
                    {activeTab === 'active'
                      ? 'Approved room requests will appear here.'
                      : 'Tenants marked as inactive will appear here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {roomOccupancies.map((room) => (
                  <Card key={room.room_id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{room.property_title}</CardTitle>
                          <p className="text-sm text-muted-foreground">Room {room.room_number}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {room.tenants.map(renderTenantCard)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmDialog.type === 'payment' ? 'Update Payment Status'
                  : confirmDialog.type === 'toggle_status' ? 'Update Tenant Status'
                  : 'Confirm Move-Out'}
              </AlertDialogTitle>
              <AlertDialogDescription>{getDialogMessage()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleConfirm(); }}
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
