import { useLocation, useNavigate } from "react-router-dom";
import { Search, FileText, Home, User, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

interface StudentBottomNavProps {
  isTenant?: boolean;
}

export function StudentBottomNav({ isTenant = false }: StudentBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    { label: "Explore", icon: Search, path: "/explore" },
    { label: "Requests", icon: FileText, path: "/requests" },
    ...(isTenant ? [{ label: "My Stay", icon: Home, path: "/my-stay" }] : []),
    { label: "Profile", icon: User, path: "/student-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === "/explore" && location.pathname === "/properties");
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
