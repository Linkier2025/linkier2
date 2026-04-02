import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationCounts {
  total: number;
  requests: number; // rental_request, rental_response, viewing_request, viewing_response
  manage: number;   // complaint, announcement, renovation
  myStay: number;   // announcement, complaint, payment
}

export function useUnreadNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, requests: 0, manage: 0, myStay: 0 });

  const fetchCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("type")
      .eq("user_id", user.id)
      .eq("read", false);

    if (error || !data) {
      setCounts({ total: 0, requests: 0, manage: 0, myStay: 0 });
      return;
    }

    const requestTypes = ["rental_request", "rental_response", "viewing_request", "viewing_response"];
    const manageTypes = ["complaint", "announcement", "renovation"];
    const myStayTypes = ["announcement", "complaint", "payment"];

    setCounts({
      total: data.length,
      requests: data.filter(n => requestTypes.includes(n.type)).length,
      manage: data.filter(n => manageTypes.includes(n.type)).length,
      myStay: data.filter(n => myStayTypes.includes(n.type)).length,
    });
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    const channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { count: counts.total, counts, refetch: fetchCount };
}
