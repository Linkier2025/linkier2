import { LandlordBottomNav } from "./LandlordBottomNav";
import { TopBackBar } from "./TopBackBar";
import { usePushPrompt } from "@/hooks/usePushPrompt";

export function LandlordLayout({ children }: { children: React.ReactNode }) {
  usePushPrompt();
  return (
    <div className="min-h-screen bg-background pb-20 safe-area-top">
      <TopBackBar />
      {children}
      <LandlordBottomNav />
    </div>
  );
}
