import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, DollarSign, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function RentTracking() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock data for tenants and payments
  const mockTenants = [
    { id: 1, name: "John Doe", property: "Apartment 2B - Avondale", rent: 450, university: "University of Zimbabwe" },
    { id: 2, name: "Jane Smith", property: "Room 3A - Mount Pleasant", rent: 350, university: "NUST" },
    { id: 3, name: "Mike Johnson", property: "Studio 1C - Borrowdale", rent: 500, university: "Midlands State University" },
  ];

  const mockPayments = [
    { id: 1, tenantId: 1, tenantName: "John Doe", amount: 450, date: "2024-01-15", method: "Bank Transfer", status: "Paid", property: "Apartment 2B - Avondale" },
    { id: 2, tenantId: 2, tenantName: "Jane Smith", amount: 350, date: "2024-01-10", method: "Cash", status: "Paid", property: "Room 3A - Mount Pleasant" },
    { id: 3, tenantId: 1, tenantName: "John Doe", amount: 450, date: "2023-12-15", method: "Mobile Money", status: "Paid", property: "Apartment 2B - Avondale" },
    { id: 4, tenantId: 3, tenantName: "Mike Johnson", amount: 500, date: "2024-01-20", method: "Bank Transfer", status: "Paid", property: "Studio 1C - Borrowdale" },
  ];

  const [paymentForm, setPaymentForm] = useState({
    tenantId: "",
    amount: "",
    paymentMethod: "",
    notes: ""
  });

  const totalRevenue = mockPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const paidThisMonth = mockPayments.filter(p => new Date(p.date).getMonth() === new Date().getMonth()).length;

  const handleInputChange = (field: string, value: string) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitPayment = () => {
    if (!paymentForm.tenantId || !paymentForm.amount || !paymentForm.paymentMethod || !selectedDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payment Recorded",
      description: "Rent payment has been successfully recorded.",
    });

    setPaymentForm({
      tenantId: "",
      amount: "",
      paymentMethod: "",
      notes: ""
    });
    setSelectedDate(new Date());
    setIsDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "Paid" ? "default" : "destructive"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Rent Tracking</h1>
            <p className="text-muted-foreground">Manage and track rent payments from your tenants</p>
          </div>
          <Button onClick={() => navigate("/landlord-dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()} USD</div>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payments This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paidThisMonth}</div>
              <p className="text-xs text-muted-foreground">Successful payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockTenants.length}</div>
              <p className="text-xs text-muted-foreground">Current tenants</p>
            </CardContent>
          </Card>
        </div>

        {/* Record New Payment */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Record Payment</CardTitle>
                <CardDescription>Add a new rent payment record</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Record New Payment</DialogTitle>
                    <DialogDescription>
                      Enter the payment details for your tenant.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant">Tenant</Label>
                      <Select value={paymentForm.tenantId} onValueChange={(value) => handleInputChange("tenantId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select tenant" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockTenants.map((tenant) => (
                            <SelectItem key={tenant.id} value={tenant.id.toString()}>
                              {tenant.name} - {tenant.property}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (USD)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="Enter amount"
                        value={paymentForm.amount}
                        onChange={(e) => handleInputChange("amount", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={paymentForm.paymentMethod} onValueChange={(value) => handleInputChange("paymentMethod", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="mobile-money">Mobile Money (EcoCash/OneMoney)</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Additional notes"
                        value={paymentForm.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitPayment}>
                      Record Payment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>View all recorded rent payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.tenantName}</TableCell>
                    <TableCell>{payment.property}</TableCell>
                    <TableCell>${payment.amount} USD</TableCell>
                    <TableCell>{format(new Date(payment.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="capitalize">{payment.method.replace("-", " ")}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}