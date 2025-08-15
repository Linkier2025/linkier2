import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Complaint {
  id: number;
  title: string;
  description: string;
  tenant: string;
  property: string;
  status: "pending" | "in-progress" | "resolved";
  date: string;
  priority: "low" | "medium" | "high";
}

const mockComplaints: Complaint[] = [
  {
    id: 1,
    title: "Leaky Faucet in Kitchen",
    description: "The kitchen faucet has been dripping constantly for the past week.",
    tenant: "John Smith",
    property: "Sunset Apartments - Unit 4B",
    status: "pending",
    date: "2024-01-15",
    priority: "medium"
  },
  {
    id: 2,
    title: "Heating Not Working",
    description: "The heating system stopped working yesterday evening.",
    tenant: "Sarah Johnson",
    property: "Oak Street House - Room 2",
    status: "in-progress",
    date: "2024-01-14",
    priority: "high"
  },
  {
    id: 3,
    title: "Noisy Neighbors",
    description: "Upstairs neighbors are being very loud during late hours.",
    tenant: "Mike Davis",
    property: "Pine View Complex - Unit 1A",
    status: "resolved",
    date: "2024-01-10",
    priority: "low"
  }
];

export default function Complaints() {
  const [complaints, setComplaints] = useState(mockComplaints);
  const [filter, setFilter] = useState<"all" | "pending" | "in-progress" | "resolved">("all");

  const updateComplaintStatus = (complaintId: number, newStatus: Complaint["status"]) => {
    setComplaints(complaints.map(complaint =>
      complaint.id === complaintId
        ? { ...complaint, status: newStatus }
        : complaint
    ));
    toast({
      title: "Status updated",
      description: `Complaint status changed to ${newStatus}.`,
    });
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
                      {complaint.date}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">{complaint.description}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Tenant:</strong> {complaint.tenant}
                    </div>
                    <div>
                      <strong>Property:</strong> {complaint.property}
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