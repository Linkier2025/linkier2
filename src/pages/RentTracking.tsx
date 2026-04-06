import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, DollarSign, TrendingUp, Users, AlertCircle, Home, Search, ArrowLeft } from "lucide-react";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface ActiveTenant {
  assignment_id: string;
  student_id: string;
  student_name: string;
  room_number: string;
  room_id: string;
  property_id: string;
  property_title: string;
  monthly_rent: number;
  payment_status: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  status: string | null;
  notes: string | null;
  months_paid_for: number;
  payment_period_start: string | null;
  payment_period_end: string | null;
  next_due_date: string | null;
  remaining_balance: number;
  receipt_number: string | null;
  tenant_name: string;
  property_title: string;
  room_number: string;
}

export default function RentTracking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [tenants, setTenants] = useState<ActiveTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMovedOut, setIsMovedOut] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    assignmentId: "",
    amount: "",
    paymentMethod: "",
    notes: "",
    monthsPaidFor: "1",
  });

  const isLandlord = profile?.user_type === "landlord";

  useEffect(() => {
    if (user) {
      if (isLandlord) {
        fetchLandlordData();
      } else {
        fetchStudentData();
      }
    }
  }, [user, isLandlord]);

  const fetchLandlordData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch active tenants
      const { data: assignmentsData, error: assignmentsError } = await (supabase
        .from('room_assignments')
        .select(`
          id,
          student_id,
          payment_status,
          rooms!inner (
            id,
            room_number,
            property_id,
            properties!inner (
              id,
              title,
              rent_amount,
              landlord_id
            )
          )
        `)
        .in('status', ['active', 'inactive'])
        .order('created_at', { ascending: false }) as any);

      if (assignmentsError) throw assignmentsError;

      const landlordAssignments = (assignmentsData || []).filter(
        (a: any) => a.rooms.properties.landlord_id === user.id
      );

      const studentIds = [...new Set(landlordAssignments.map((a: any) => a.student_id))];
      let studentsMap = new Map<string, string>();
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname')
          .in('user_id', studentIds as string[]);
        studentsData?.forEach((s) => {
          studentsMap.set(s.user_id, `${s.first_name || ''} ${s.surname || ''}`.trim() || 'Unknown');
        });
      }

      const activeTenants: ActiveTenant[] = landlordAssignments.map((a: any) => ({
        assignment_id: a.id,
        student_id: a.student_id,
        student_name: studentsMap.get(a.student_id) || 'Unknown',
        room_number: a.rooms.room_number,
        room_id: a.rooms.id,
        property_id: a.rooms.properties.id,
        property_title: a.rooms.properties.title,
        monthly_rent: a.rooms.properties.rent_amount,
        payment_status: a.payment_status || 'unpaid',
      }));

      setTenants(activeTenants);

      // Fetch payments
      const { data: paymentsData, error: paymentsError } = await (supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          status,
          notes,
          months_paid_for,
          payment_period_start,
          payment_period_end,
          next_due_date,
          remaining_balance,
          receipt_number,
          assignment_id
        `)
        .not('assignment_id', 'is', null)
        .order('payment_date', { ascending: false }) as any);

      if (paymentsError) throw paymentsError;

      // Enrich payments with tenant info
      const enrichedPayments: PaymentRecord[] = (paymentsData || []).map((p: any) => {
        const tenant = activeTenants.find(t => t.assignment_id === p.assignment_id);
        return {
          ...p,
          tenant_name: tenant?.student_name || 'Unknown',
          property_title: tenant?.property_title || 'Unknown',
          room_number: tenant?.room_number || '-',
        };
      });

      setPayments(enrichedPayments);
    } catch (error) {
      console.error('Error fetching landlord data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get student's active assignment
      const { data: assignmentData } = await (supabase
        .from('room_assignments')
        .select(`
          id,
          status,
          payment_status,
          rooms!inner (
            room_number,
            property_id,
            properties!inner (title, rent_amount)
          )
        `)
        .eq('student_id', user.id)
        .in('status', ['active', 'inactive', 'moved_out'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle() as any);

      if (!assignmentData) {
        setLoading(false);
        return;
      }

      setIsMovedOut(assignmentData.status === 'moved_out');

      // Fetch payments for this student's assignment
      const { data: paymentsData } = await (supabase
        .from('payments')
        .select('*')
        .eq('assignment_id', assignmentData.id)
        .order('payment_date', { ascending: false }) as any);

      const room = assignmentData.rooms as any;
      const property = room.properties;

      const enrichedPayments: PaymentRecord[] = (paymentsData || []).map((p: any) => ({
        ...p,
        tenant_name: `${profile?.first_name || ''} ${profile?.surname || ''}`.trim(),
        property_title: property.title,
        room_number: room.room_number,
      }));

      setPayments(enrichedPayments);
      setTenants([{
        assignment_id: assignmentData.id,
        student_id: user.id,
        student_name: `${profile?.first_name || ''} ${profile?.surname || ''}`.trim(),
        room_number: room.room_number,
        room_id: '',
        property_id: room.property_id,
        property_title: property.title,
        monthly_rent: property.rent_amount,
        payment_status: assignmentData.payment_status || 'unpaid',
      }]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTenant = tenants.find(t => t.assignment_id === paymentForm.assignmentId);
  const monthsCount = parseInt(paymentForm.monthsPaidFor) || 1;
  const totalDue = selectedTenant ? selectedTenant.monthly_rent * monthsCount : 0;
  const amountPaid = parseFloat(paymentForm.amount) || 0;
  const remainingBalance = Math.max(0, totalDue - amountPaid);
  const paymentPeriodEnd = selectedDate ? addMonths(selectedDate, monthsCount) : null;
  const nextDueDate = paymentPeriodEnd ? addMonths(paymentPeriodEnd, 0) : null;

  const paymentStatusCalc = () => {
    if (amountPaid <= 0) return 'unpaid';
    if (remainingBalance === 0) return 'paid';
    return 'partially_paid';
  };

  const filteredTenants = useMemo(() => {
    if (!tenantSearch) return tenants;
    const search = tenantSearch.toLowerCase();
    return tenants.filter(t =>
      t.student_name.toLowerCase().includes(search) ||
      t.room_number.toLowerCase().includes(search) ||
      t.property_title.toLowerCase().includes(search)
    );
  }, [tenants, tenantSearch]);

  const handleInputChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const handleShowConfirmation = () => {
    if (!paymentForm.assignmentId || !paymentForm.amount || !paymentForm.paymentMethod || !selectedDate) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (parseFloat(paymentForm.amount) <= 0) {
      toast({ title: "Invalid Amount", description: "Payment amount must be positive.", variant: "destructive" });
      return;
    }
    if (monthsCount < 1) {
      toast({ title: "Invalid Months", description: "Months paid must be at least 1.", variant: "destructive" });
      return;
    }
    setConfirmDialog(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedTenant || !selectedDate || !user) return;
    setSubmitting(true);
    setConfirmDialog(false);

    try {
      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;
      const status = paymentStatusCalc();

      const { error } = await (supabase.from('payments').insert({
        assignment_id: selectedTenant.assignment_id,
        amount: amountPaid,
        payment_date: format(selectedDate, 'yyyy-MM-dd'),
        payment_method: paymentForm.paymentMethod,
        notes: paymentForm.notes || null,
        months_paid_for: monthsCount,
        payment_period_start: format(selectedDate, 'yyyy-MM-dd'),
        payment_period_end: paymentPeriodEnd ? format(paymentPeriodEnd, 'yyyy-MM-dd') : null,
        next_due_date: nextDueDate ? format(nextDueDate, 'yyyy-MM-dd') : null,
        remaining_balance: remainingBalance,
        status: status,
        receipt_number: receiptNumber,
        rental_id: null,
      } as any) as any);

      if (error) throw error;

      // Update room_assignment payment_status
      const newPaymentStatus = status === 'paid' ? 'paid' : 'unpaid';
      await (supabase.rpc as any)('toggle_payment_status', {
        p_assignment_id: selectedTenant.assignment_id,
        p_status: newPaymentStatus,
      });

      toast({ title: "Payment Recorded ✓", description: `Payment of $${amountPaid} successfully recorded.` });

      setPaymentForm({ assignmentId: "", amount: "", paymentMethod: "", notes: "", monthsPaidFor: "1" });
      setSelectedDate(new Date());
      setIsDialogOpen(false);

      if (isLandlord) fetchLandlordData();
      else fetchStudentData();
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast({ title: "Error", description: error.message || "Failed to record payment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    const s = status || 'unpaid';
    const isOverdue = false; // will check with next_due_date
    if (s === 'paid') return <Badge className="bg-green-600">Paid</Badge>;
    if (s === 'partially_paid') return <Badge variant="secondary" className="bg-amber-500 text-white">Partial</Badge>;
    return <Badge variant="destructive">Unpaid</Badge>;
  };

  const getOverdueBadge = (nextDueDate: string | null) => {
    if (!nextDueDate) return null;
    if (new Date() > new Date(nextDueDate)) {
      return <Badge variant="destructive" className="ml-1">Overdue</Badge>;
    }
    return null;
  };

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const paidThisMonth = payments.filter(p => new Date(p.payment_date).getMonth() === new Date().getMonth()).length;

  // Student view
  if (!isLandlord) {
    const currentTenant = tenants[0];
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const latestPayment = payments[0];
    const monthlyRent = currentTenant?.monthly_rent || 0;
    const lastRemainingBalance = latestPayment?.remaining_balance || 0;

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/my-stay")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Rent Tracking</h1>
              <p className="text-sm text-muted-foreground">View your payment history</p>
            </div>
          </div>

          {!currentTenant ? (
            <Card className="text-center py-12">
              <CardContent>
                <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No Active Rental</p>
                <p className="text-sm text-muted-foreground">You need to be a tenant to see rent info.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Monthly Rent</p>
                    <p className="text-xl font-bold">${monthlyRent}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">${totalPaid}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className={`text-xl font-bold ${lastRemainingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${lastRemainingBalance}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Next Due</p>
                    <p className="text-sm font-bold">
                      {latestPayment?.next_due_date
                        ? format(new Date(latestPayment.next_due_date), "MMM dd, yyyy")
                        : "N/A"}
                    </p>
                    {getOverdueBadge(latestPayment?.next_due_date || null)}
                  </CardContent>
                </Card>
              </div>

              {/* Status */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{currentTenant.property_title}</p>
                      <p className="text-sm text-muted-foreground">Room {currentTenant.room_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(latestPayment?.status || 'unpaid')}
                      {getOverdueBadge(latestPayment?.next_due_date || null)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">No payments recorded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">${p.amount}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(p.payment_date), "MMM dd, yyyy")} • {p.payment_method?.replace("-", " ")}
                            </p>
                            {p.months_paid_for > 1 && (
                              <p className="text-xs text-muted-foreground">{p.months_paid_for} months</p>
                            )}
                          </div>
                          <div className="text-right">
                            {getStatusBadge(p.status)}
                            {p.receipt_number && (
                              <p className="text-xs text-muted-foreground mt-1">{p.receipt_number}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Landlord view
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/my-properties")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Rent Tracking</h1>
            <p className="text-sm text-muted-foreground">Manage tenant payments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={tenants.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>Enter payment details for a tenant.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Searchable Tenant Dropdown */}
                <div className="space-y-2">
                  <Label>Tenant</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tenant..."
                        value={tenantSearch}
                        onChange={(e) => setTenantSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="max-h-40 border rounded-md">
                      {filteredTenants.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground text-center">No active tenants</p>
                      ) : (
                        <div className="p-1">
                          {filteredTenants.map((tenant) => (
                            <button
                              key={tenant.assignment_id}
                              type="button"
                              className={cn(
                                "w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors",
                                paymentForm.assignmentId === tenant.assignment_id && "bg-primary/10 border border-primary"
                              )}
                              onClick={() => handleInputChange("assignmentId", tenant.assignment_id)}
                            >
                              <p className="font-medium">{tenant.student_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {tenant.property_title} • Room {tenant.room_number} • ${tenant.monthly_rent}/mo
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter amount"
                    value={paymentForm.amount}
                    onChange={(e) => handleInputChange("amount", e.target.value)}
                  />
                </div>

                {/* Months Paid */}
                <div className="space-y-2">
                  <Label>Months Being Paid</Label>
                  <Input
                    type="number"
                    min="1"
                    value={paymentForm.monthsPaidFor}
                    onChange={(e) => handleInputChange("monthsPaidFor", e.target.value)}
                  />
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={paymentForm.paymentMethod} onValueChange={(v) => handleInputChange("paymentMethod", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile-money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="Additional notes"
                    value={paymentForm.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                  />
                </div>

                {/* Summary Preview */}
                {selectedTenant && amountPaid > 0 && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 text-sm space-y-1">
                      <p className="font-medium">Payment Summary</p>
                      <p>Tenant: {selectedTenant.student_name}</p>
                      <p>Total due ({monthsCount} month{monthsCount > 1 ? 's' : ''} × ${selectedTenant.monthly_rent}): <strong>${totalDue}</strong></p>
                      <p>Amount paying: <strong>${amountPaid}</strong></p>
                      <p>Remaining: <strong className={remainingBalance > 0 ? 'text-red-600' : 'text-green-600'}>${remainingBalance}</strong></p>
                      <p>Status: {remainingBalance === 0 ? '✅ Paid' : '⚠️ Partially Paid'}</p>
                      {nextDueDate && (
                        <p>Next payment due: <strong>{format(nextDueDate, "MMM dd, yyyy")}</strong></p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleShowConfirmation} disabled={submitting}>
                    {submitting ? "Recording..." : "Record Payment"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Revenue</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">${totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">This Month</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{paidThisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Tenants</span>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{tenants.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Payment Overview */}
        {tenants.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tenant Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tenants.map((tenant) => {
                  const tenantPayments = payments.filter(p => p.tenant_name === tenant.student_name);
                  const latestPayment = tenantPayments[0];
                  const totalPaid = tenantPayments.reduce((s, p) => s + Number(p.amount), 0);

                  return (
                    <div key={tenant.assignment_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{tenant.student_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.property_title} • Room {tenant.room_number}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="text-sm font-medium">${totalPaid} / ${tenant.monthly_rent}</p>
                          {latestPayment?.next_due_date && (
                            <p className="text-xs text-muted-foreground">
                              Due: {format(new Date(latestPayment.next_due_date), "MMM dd")}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(latestPayment?.status || 'unpaid')}
                        {getOverdueBadge(latestPayment?.next_due_date || null)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No payments recorded yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <p className="font-medium">{p.tenant_name}</p>
                          <p className="text-xs text-muted-foreground">Room {p.room_number}</p>
                        </TableCell>
                        <TableCell>${p.amount}</TableCell>
                        <TableCell className="text-sm">{format(new Date(p.payment_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell className="capitalize text-sm">{p.payment_method?.replace("-", " ")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getStatusBadge(p.status)}
                            {getOverdueBadge(p.next_due_date)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Payment</AlertDialogTitle>
              <AlertDialogDescription>
                {selectedTenant && (
                  <div className="space-y-1 mt-2">
                    <p>Recording payment for <strong>{selectedTenant.student_name}</strong></p>
                    <p>Amount: <strong>${amountPaid}</strong> for {monthsCount} month{monthsCount > 1 ? 's' : ''}</p>
                    {nextDueDate && <p>Next payment due: <strong>{format(nextDueDate, "MMM dd, yyyy")}</strong></p>}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmitPayment} disabled={submitting}>
                {submitting ? "Recording..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
