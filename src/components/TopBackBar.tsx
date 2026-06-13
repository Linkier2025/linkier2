import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

// Routes that have the bottom-nav tabs — no back arrow on these.
const TAB_ROUTES = new Set<string>([
  // student
  "/explore",
  "/properties",
  "/wishlist",
  "/requests",
  "/my-stay",
  "/student-profile",
  "/student-dashboard",
  // landlord
  "/my-properties",
  "/landlord-dashboard",
  "/viewing-requests",
  "/tenants",
  "/manage",
  "/landlord-profile",
]);

interface TopBackBarProps {
  fallback?: string;
  force?: boolean;
}

export function TopBackBar({ fallback, force = false }: TopBackBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!force && TAB_ROUTES.has(location.pathname)) return null;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else if (fallback) {
      navigate(fallback);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md safe-area-top">
      <div className="flex items-center h-12 px-3">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="inline-flex items-center justify-center h-10 w-10 -ml-2 rounded-full text-foreground hover:bg-muted active:scale-95 transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
