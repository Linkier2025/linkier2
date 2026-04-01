import { LandlordBottomNav } from "./LandlordBottomNav";

export function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <LandlordBottomNav />
    </div>
  );
}
