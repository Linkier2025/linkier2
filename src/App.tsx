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
import StudentProfile from "./pages/StudentProfile";
import LandlordProfile from "./pages/LandlordProfile";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import AddProperty from "./pages/AddProperty";
import Messages from "./pages/Messages";
import Tenants from "./pages/Tenants";
import RentTracking from "./pages/RentTracking";
import PaymentHistory from "./pages/PaymentHistory";
import Notifications from "./pages/Notifications";
import Rentals from "./pages/Rentals";
import Complaints from "./pages/Complaints";
import MyRequests from "./pages/MyRequests";

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
          <Route path="/student-profile" element={<StudentProfile />} />
          <Route path="/landlord-profile" element={<LandlordProfile />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
          <Route path="/add-property" element={<AddProperty />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/rent-tracking" element={<RentTracking />} />
          <Route path="/payment-history" element={<PaymentHistory />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/rentals" element={<Rentals />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/my-requests" element={<MyRequests />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
