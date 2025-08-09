import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Calendar, FileText, TrendingDown } from "lucide-react";
import { format } from "date-fns";

export default function PaymentHistory() {
  const navigate = useNavigate();
  const [filterYear, setFilterYear] = useState("2024");

  // Mock payment history for the current student
  const mockPayments = [
    { 
      id: 1, 
      amount: 450, 
      date: "2024-01-15", 
      method: "Bank Transfer", 
      status: "Paid", 
      property: "Apartment 2B - Avondale",
      landlord: "Robert Mugabe",
      receiptNumber: "RCP-2024-001"
    },
    { 
      id: 2, 
      amount: 450, 
      date: "2023-12-15", 
      method: "Mobile Money", 
      status: "Paid", 
      property: "Apartment 2B - Avondale",
      landlord: "Robert Mugabe",
      receiptNumber: "RCP-2023-012"
    },
    { 
      id: 3, 
      amount: 450, 
      date: "2023-11-15", 
      method: "Bank Transfer", 
      status: "Paid", 
      property: "Apartment 2B - Avondale",
      landlord: "Robert Mugabe",
      receiptNumber: "RCP-2023-011"
    },
    { 
      id: 4, 
      amount: 450, 
      date: "2023-10-15", 
      method: "Cash", 
      status: "Paid", 
      property: "Apartment 2B - Avondale",
      landlord: "Robert Mugabe",
      receiptNumber: "RCP-2023-010"
    },
  ];

  const filteredPayments = mockPayments.filter(payment => 
    new Date(payment.date).getFullYear().toString() === filterYear
  );

  const totalPaid = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPayments = filteredPayments.length;
  const averagePayment = totalPayments > 0 ? totalPaid / totalPayments : 0;

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === "Paid" ? "default" : status === "Pending" ? "secondary" : "destructive"}>
        {status}
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "bank transfer":
        return "🏦";
      case "mobile money":
        return "📱";
      case "cash":
        return "💵";
      default:
        return "💳";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Payment History</h1>
            <p className="text-muted-foreground">View your rent payment records and history</p>
          </div>
          <Button onClick={() => navigate("/student-dashboard")}>
            Back to Dashboard
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid ({filterYear})</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPaid.toLocaleString()} USD</div>
              <p className="text-xs text-muted-foreground">This year</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPayments}</div>
              <p className="text-xs text-muted-foreground">Payments made</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${averagePayment.toFixed(0)} USD</div>
              <p className="text-xs text-muted-foreground">Per payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Up to Date</div>
              <p className="text-xs text-muted-foreground">All payments current</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Property Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Rental</CardTitle>
            <CardDescription>Your current accommodation details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Property</p>
                <p className="text-lg font-semibold">Apartment 2B - Avondale</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Landlord</p>
                <p className="text-lg font-semibold">Robert Mugabe</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Rent</p>
                <p className="text-lg font-semibold text-primary">$450 USD</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Payment Records</CardTitle>
                <CardDescription>Detailed history of your rent payments</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="year-filter" className="text-sm font-medium">
                  Filter by Year:
                </label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Receipt Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Property</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(payment.date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      ${payment.amount} USD
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getPaymentMethodIcon(payment.method)}</span>
                        {payment.method}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.receiptNumber}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {payment.property}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredPayments.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No payments found for {filterYear}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Tips */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Accepted Payment Methods:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>🏦 Bank Transfer</li>
                  <li>📱 Mobile Money (EcoCash, OneMoney)</li>
                  <li>💵 Cash (with receipt)</li>
                  <li>💳 Cheque</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payment Reminders:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Rent is due on the 15th of each month</li>
                  <li>• Late payments may incur additional fees</li>
                  <li>• Always request a receipt for cash payments</li>
                  <li>• Contact your landlord for payment issues</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}