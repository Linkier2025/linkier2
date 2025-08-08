import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import SignupChoice from "./pages/SignupChoice";
import StudentLogin from "./pages/StudentLogin";
import LandlordLogin from "./pages/LandlordLogin";
import StudentSignup from "./pages/StudentSignup";
import LandlordSignup from "./pages/LandlordSignup";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard";
import LandlordDashboard from "./pages/LandlordDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup-choice" element={<SignupChoice />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/landlord-login" element={<LandlordLogin />} />
          <Route path="/student-signup" element={<StudentSignup />} />
          <Route path="/landlord-signup" element={<LandlordSignup />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/landlord-dashboard" element={<LandlordDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
