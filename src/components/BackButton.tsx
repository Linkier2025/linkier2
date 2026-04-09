import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  fallback?: string;
  label?: string;
}

export function BackButton({ fallback, label }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (fallback) {
      navigate(fallback);
    } else {
      navigate(-1);
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label && <span>{label}</span>}
    </button>
  );
}
