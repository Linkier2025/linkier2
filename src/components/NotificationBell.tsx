import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { count } = useUnreadNotifications();

  return (
    <button
      onClick={() => navigate("/notifications")}
      className={cn("relative p-2 rounded-full hover:bg-accent transition-colors", className)}
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5 text-foreground" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
