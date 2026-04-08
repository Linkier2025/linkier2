import { useEffect, useState } from "react";
import { StudentBottomNav } from "./StudentBottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { usePushPrompt } from "@/hooks/usePushPrompt";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isTenant, setIsTenant] = useState(false);

  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { count } = await supabase
        .from("room_assignments")
        .select("*", { count: "exact", head: true })
        .eq("student_id", user.id)
        .in("status", ["active", "inactive", "moved_out"]);
      setIsTenant((count || 0) > 0);
    };
    check();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <StudentBottomNav isTenant={isTenant} />
    </div>
  );
}
