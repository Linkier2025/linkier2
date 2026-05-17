import { LandlordBottomNav } from "./LandlordBottomNav";
import { usePushPrompt } from "@/hooks/usePushPrompt";

export function LandlordLayout({ children }: { children: React.ReactNode }) {
  usePushPrompt();
  return (
    <div className="min-h-screen bg-background pb-20 safe-area-top">
      {children}
      <LandlordBottomNav />
    </div>
  );
}
