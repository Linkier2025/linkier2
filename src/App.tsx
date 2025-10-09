import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import Complaints from "./pages/Complaints";
import RentTracking from "./pages/RentTracking";
import PaymentHistory from "./pages/PaymentHistory";
import Notifications from "./pages/Notifications";
import Rentals from "./pages/Rentals";
import MyRequests from "./pages/MyRequests";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup-choice" element={<SignupChoice />} />
            <Route path="/student-login" element={<StudentLogin />} />
            <Route path="/landlord-login" element={<LandlordLogin />} />
            <Route path="/student-signup" element={<StudentSignup />} />
            <Route path="/landlord-signup" element={<LandlordSignup />} />
            <Route path="/student-dashboard" element={
              <ProtectedRoute userType="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/landlord-dashboard" element={
              <ProtectedRoute userType="landlord">
                <LandlordDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student-profile" element={
              <ProtectedRoute userType="student">
                <StudentProfile />
              </ProtectedRoute>
            } />
            <Route path="/landlord-profile" element={
              <ProtectedRoute userType="landlord">
                <LandlordProfile />
              </ProtectedRoute>
            } />
            <Route path="/properties" element={
              <ProtectedRoute userType="student">
                <Properties />
              </ProtectedRoute>
            } />
            <Route path="/property/:id" element={
              <ProtectedRoute userType="student">
                <PropertyDetails />
              </ProtectedRoute>
            } />
            <Route path="/add-property" element={
              <ProtectedRoute userType="landlord">
                <AddProperty />
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            } />
            <Route path="/tenants" element={
              <ProtectedRoute userType="landlord">
                <Tenants />
              </ProtectedRoute>
            } />
            <Route path="/complaints" element={
              <ProtectedRoute>
                <Complaints />
              </ProtectedRoute>
            } />
            <Route path="/rent-tracking" element={
              <ProtectedRoute>
                <RentTracking />
              </ProtectedRoute>
            } />
            <Route path="/payment-history" element={
              <ProtectedRoute userType="student">
                <PaymentHistory />
              </ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            } />
            <Route path="/rentals" element={
              <ProtectedRoute userType="student">
                <Rentals />
              </ProtectedRoute>
            } />
            <Route path="/my-requests" element={
              <ProtectedRoute userType="student">
                <MyRequests />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
