import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  const fetchCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: unread } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    setCount(unread || 0);
  };

  useEffect(() => {
    fetchCount();

    const interval = setInterval(fetchCount, 30000);

    const channel = supabase
      .channel("notification-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return { count, refetch: fetchCount };
}
