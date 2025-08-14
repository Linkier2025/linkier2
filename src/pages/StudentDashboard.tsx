import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import linkierLogo from "@/assets/linkier-logo.png";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Basic SEO handling
  useEffect(() => {
    document.title = "Student Dashboard | Linkier";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Student dashboard for Linkier housing platform.");
    if (!meta.parentElement) document.head.appendChild(meta);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-gradient-hero">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={linkierLogo} alt="Linkier logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-white">Student Dashboard</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Empty dashboard - ready for content */}
      </main>
    </div>
  );
};

export default StudentDashboard;