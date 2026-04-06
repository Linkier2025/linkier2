import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, MapPin, DoorOpen, Gift, CheckCircle, X, Eye, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentLayout } from "@/components/StudentLayout";
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

interface RequestItem {
  id: string;
  type: "viewing" | "rental";
  property_id: string;
  property_title: string;
  property_location: string;
  property_rent: number;
  property_image: string | null;
  room_number: string | null;
  status: string;
  created_at: string;
  student_message: string | null;
  scheduled_date?: string | null;
}

export default function Requests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; request: RequestItem | null }>({ open: false, request: null });

  const { markCategoryAsRead } = useUnreadNotifications();

  useEffect(() => {
    document.title = "My Requests | Linkier";
    if (user) {
      fetchRequests();
      markCategoryAsRead("requests");
    }
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch viewings
      const { data: viewingsData } = await supabase
        .from("property_viewings")
        .select("id, status, requested_at, scheduled_date, student_message, property_id, properties(title, location, rent_amount, images)")
        .eq("student_id", user.id)
        .order("requested_at", { ascending: false });

      // Fetch rental requests
      const { data: rentalsData } = await supabase
        .from("rental_requests")
        .select("id, status, requested_at, student_message, property_id, room_id, properties(title, location, rent_amount, images)")
        .eq("student_id", user.id)
        .order("requested_at", { ascending: false });

      // Get room numbers for rental requests with room_id
      const roomIds = (rentalsData || []).filter(r => (r as any).room_id).map(r => (r as any).room_id);
      let roomsMap = new Map<string, string>();
      if (roomIds.length > 0) {
        const { data: roomsData } = await supabase.from("rooms").select("id, room_number").in("id", roomIds);
        roomsData?.forEach(r => roomsMap.set(r.id, r.room_number));
      }

      const allRequests: RequestItem[] = [
        ...(viewingsData || []).map((v: any) => ({
          id: v.id,
          type: "viewing" as const,
          property_id: v.property_id,
          property_title: v.properties?.title || "Unknown",
          property_location: v.properties?.location || "",
          property_rent: v.properties?.rent_amount || 0,
          property_image: v.properties?.images?.[0] || null,
          room_number: null,
          status: v.status,
          created_at: v.requested_at,
          student_message: v.student_message,
          scheduled_date: v.scheduled_date,
        })),
        ...(rentalsData || []).map((r: any) => ({
          id: r.id,
          type: "rental" as const,
          property_id: r.property_id,
          property_title: r.properties?.title || "Unknown",
          property_location: r.properties?.location || "",
          property_rent: r.properties?.rent_amount || 0,
          property_image: r.properties?.images?.[0] || null,
          room_number: r.room_id ? roomsMap.get(r.room_id) || null : null,
          status: r.status,
          created_at: r.requested_at,
          student_message: r.student_message,
        })),
      ];

      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (req: RequestItem) => {
    try {
      const table = req.type === "viewing" ? "property_viewings" : "rental_requests";
      const { error } = await supabase.from(table).update({ status: "cancelled" }).eq("id", req.id);
      if (error) throw error;
      toast({ title: "Request cancelled" });
      fetchRequests();
    } catch {
      toast({ title: "Error", description: "Failed to cancel", variant: "destructive" });
    }
  };

  const handleAcceptOffer = async () => {
    const req = confirmDialog.request;
    if (!req) return;
    setAcceptingOffer(true);
    try {
      const { data, error } = await (supabase.rpc as any)("accept_offer", { p_request_id: req.id });
      if (error) throw error;
      toast({ title: "Offer Accepted! 🎉", description: `You are now a tenant in Room ${(data as any)?.room_number}.` });
      setConfirmDialog({ open: false, request: null });
      fetchRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to accept offer", variant: "destructive" });
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleDeclineOffer = async (requestId: string) => {
    try {
      const { error } = await supabase.from("rental_requests").update({ status: "declined" }).eq("id", requestId);
      if (error) throw error;
      toast({ title: "Offer declined" });
      fetchRequests();
    } catch {
      toast({ title: "Error", description: "Failed to decline", variant: "destructive" });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      scheduled: "Scheduled",
      approved: "Offer Received",
      accepted: "Accepted",
      completed: "Completed",
      cancelled: "Cancelled",
      declined: "Rejected",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "approved") return "default";
    if (["cancelled", "declined"].includes(status)) return "destructive";
    if (["accepted", "completed"].includes(status)) return "outline";
    return "secondary";
  };

  const pending = requests.filter(r => ["pending", "scheduled"].includes(r.status));
  const offers = requests.filter(r => r.status === "approved" && r.type === "rental");
  const accepted = requests.filter(r => ["accepted", "completed"].includes(r.status));
  const rejected = requests.filter(r => ["cancelled", "declined"].includes(r.status));

  const RequestCard = ({ req }: { req: RequestItem }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-3 p-4">
          <img
            src={req.property_image || "/placeholder.svg"}
            alt={req.property_title}
            className="w-20 h-20 object-cover rounded-lg shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm truncate">{req.property_title}</h3>
              <Badge variant={getStatusVariant(req.status)} className="shrink-0 text-[10px]">
                {getStatusLabel(req.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <MapPin className="h-3 w-3" />
              {req.property_location}
            </div>
            {req.room_number && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <DoorOpen className="h-3 w-3" />
                Room {req.room_number}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-medium text-primary">${req.property_rent}/mo</span>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                {req.type === "viewing" ? <Eye className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                {req.type === "viewing" ? "Viewing" : "Rental"}
              </div>
            </div>

            {/* Actions */}
            {req.status === "approved" && req.type === "rental" && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 flex-1" onClick={() => setConfirmDialog({ open: true, request: req })}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Accept
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDeclineOffer(req.id)}>
                  <X className="h-3 w-3 mr-1" /> Decline
                </Button>
              </div>
            )}
            {req.status === "pending" && (
              <Button size="sm" variant="ghost" className="h-7 text-xs mt-2 text-destructive" onClick={() => handleCancelRequest(req)}>
                Cancel Request
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">My Requests</h1>
      </div>

      {offers.length > 0 && (
        <div className="mx-4 mb-4 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-800">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              You have {offers.length} offer{offers.length > 1 ? "s" : ""} waiting!
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue={offers.length > 0 ? "offers" : "pending"} className="px-4">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="pending" className="text-xs">Pending {pending.length > 0 && `(${pending.length})`}</TabsTrigger>
          <TabsTrigger value="offers" className="text-xs">Offers {offers.length > 0 && `(${offers.length})`}</TabsTrigger>
          <TabsTrigger value="accepted" className="text-xs">Accepted</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pending.length === 0 ? <EmptyState message="No pending requests" /> : pending.map(r => <RequestCard key={r.id} req={r} />)}
        </TabsContent>
        <TabsContent value="offers" className="space-y-3 mt-4">
          {offers.length === 0 ? <EmptyState message="No offers yet" /> : offers.map(r => <RequestCard key={r.id} req={r} />)}
        </TabsContent>
        <TabsContent value="accepted" className="space-y-3 mt-4">
          {accepted.length === 0 ? <EmptyState message="No accepted requests" /> : accepted.map(r => <RequestCard key={r.id} req={r} />)}
        </TabsContent>
        <TabsContent value="rejected" className="space-y-3 mt-4">
          {rejected.length === 0 ? <EmptyState message="No history yet" /> : rejected.map(r => <RequestCard key={r.id} req={r} />)}
        </TabsContent>
      </Tabs>

      {/* Accept Offer Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept This Offer?</AlertDialogTitle>
            <AlertDialogDescription>
              You will become a tenant at <strong>{confirmDialog.request?.property_title}</strong>.
              All other pending requests will be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acceptingOffer}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptOffer} disabled={acceptingOffer} className="bg-green-600 hover:bg-green-700">
              {acceptingOffer ? "Accepting..." : "Accept Offer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
}
