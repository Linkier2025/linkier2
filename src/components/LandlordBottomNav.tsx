import { useLocation, useNavigate } from "react-router-dom";
import { Building, FileText, Users, Settings2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
}

export function LandlordBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { count: unreadCount } = useUnreadNotifications();

  const navItems: NavItem[] = [
    { label: "Properties", icon: Building, path: "/my-properties" },
    { label: "Requests", icon: FileText, path: "/viewing-requests" },
    { label: "Tenants", icon: Users, path: "/tenants" },
    { label: "Manage", icon: Settings2, path: "/manage" },
    { label: "Alerts", icon: Bell, path: "/notifications", badge: unreadCount },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/my-properties" && (location.pathname === "/landlord-dashboard" || location.pathname.startsWith("/edit-property"))) ||
            (item.path === "/manage" && (location.pathname === "/announcements" || location.pathname === "/complaints" || location.pathname === "/renovations"));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
