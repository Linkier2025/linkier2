import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const TAB_ROUTES = new Set<string>([
  "/",
  "/explore",
  "/wishlist",
  "/requests",
  "/my-stay",
  "/student-profile",
  "/student-dashboard",
  "/properties",
  "/my-properties",
  "/landlord-dashboard",
  "/viewing-requests",
  "/tenants",
  "/manage",
  "/landlord-profile",
]);

interface TopBackBarProps {
  fallback?: string;
}

export function TopBackBar({ fallback = "/" }: TopBackBarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  if (TAB_ROUTES.has(location.pathname)) return null;

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  };

  return (
    <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md safe-area-top">
      <div className="flex items-center h-12 px-2">
        <button
          onClick={handleBack}
          aria-label="Go back"
          className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-muted active:bg-muted/70 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
