import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, MessageSquare, ChevronRight, Bell, HardHat } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

export default function Manage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaintsCount, setComplaintsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const { data: props } = await supabase
        .from("properties")
        .select("id")
        .eq("landlord_id", user.id);
      const propIds = (props || []).map((p) => p.id);
      if (propIds.length > 0) {
        const { count } = await supabase
          .from("complaints")
          .select("*", { count: "exact", head: true })
          .in("property_id", propIds)
          .in("status", ["pending", "in_progress"]);
        setComplaintsCount(count || 0);
      }
    };
    fetchCounts();
  }, [user]);

  const items = [
    {
      label: "Announcements",
      description: "Create and manage announcements for your tenants",
      icon: Megaphone,
      path: "/announcements",
      badge: null,
    },
    {
      label: "Complaints",
      description: "View and resolve tenant complaints",
      icon: MessageSquare,
      path: "/complaints",
      badge: complaintsCount > 0 ? complaintsCount : null,
    },
    {
      label: "Notifications",
      description: "View your notifications",
      icon: Bell,
      path: "/notifications",
      badge: null,
    },
  ];

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Manage</h1>

        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.path}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(item.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.label}</h3>
                      {item.badge && (
                        <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
