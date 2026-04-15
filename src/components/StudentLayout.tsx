import { StudentBottomNav } from "./StudentBottomNav";
import { usePushPrompt } from "@/hooks/usePushPrompt";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  usePushPrompt();

  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
      <StudentBottomNav />
    </div>
  );
}
