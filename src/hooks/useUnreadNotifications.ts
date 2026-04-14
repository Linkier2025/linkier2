import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationCounts {
  total: number;
  requests: number;
  manage: number;
  myStay: number;
}

const requestTypes = ["rental_request", "rental_response", "viewing_request", "viewing_response"];
const manageTypes = ["complaint", "announcement", "renovation"];
const myStayTypes = ["announcement", "complaint", "payment"];

export function useUnreadNotifications() {
  const [counts, setCounts] = useState<NotificationCounts>({ total: 0, requests: 0, manage: 0, myStay: 0 });

  const fetchCount = useCallback(async () => {
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

    setCounts({
      total: data.length,
      requests: data.filter(n => requestTypes.includes(n.type)).length,
      manage: data.filter(n => manageTypes.includes(n.type)).length,
      myStay: data.filter(n => myStayTypes.includes(n.type)).length,
    });
  }, []);

  const markCategoryAsRead = useCallback(async (category: "requests" | "manage" | "myStay") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const types = category === "requests" ? requestTypes
      : category === "manage" ? manageTypes
      : myStayTypes;

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .in("type", types);

    if (!error) {
      fetchCount();
    }
  }, [fetchCount]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      fetchCount();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchCount()
        )
        .subscribe();
    };

    setup();
    const interval = setInterval(fetchCount, 30000);

    return () => {
      clearInterval(interval);
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchCount]);

  return { count: counts.total, counts, refetch: fetchCount, markCategoryAsRead };
}
