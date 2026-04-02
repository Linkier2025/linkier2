import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentLayout } from "@/components/StudentLayout";
import { LandlordLayout } from "@/components/LandlordLayout";

import Landing from "./pages/Landing";
import SignupChoice from "./pages/SignupChoice";
import StudentLogin from "./pages/StudentLogin";
import LandlordLogin from "./pages/LandlordLogin";
import StudentSignup from "./pages/StudentSignup";
import LandlordSignup from "./pages/LandlordSignup";
import NotFound from "./pages/NotFound";
import StudentProfile from "./pages/StudentProfile";
import LandlordProfile from "./pages/LandlordProfile";
import PropertyDetails from "./pages/PropertyDetails";
import AddProperty from "./pages/AddProperty";
import Explore from "./pages/Explore";
import Requests from "./pages/Requests";
import MyStay from "./pages/MyStay";
import Manage from "./pages/Manage";

import Tenants from "./pages/Tenants";
import Complaints from "./pages/Complaints";
import RentTracking from "./pages/RentTracking";
import PaymentHistory from "./pages/PaymentHistory";
import Notifications from "./pages/Notifications";
import Rentals from "./pages/Rentals";
import MyProperties from "./pages/MyProperties";
import ViewingRequests from "./pages/ViewingRequests";
import Announcements from "./pages/Announcements";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Settings from "./pages/Settings";

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
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Student routes with bottom nav */}
              <Route path="/explore" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Explore /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/requests" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Requests /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/my-stay" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><MyStay /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/student-dashboard" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Explore /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/student-profile" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><StudentProfile /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/properties" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Explore /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/property/:id" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><PropertyDetails /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/payment-history" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><PaymentHistory /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/rentals" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Rentals /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/student-complaints" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Complaints /></StudentLayout>
                </ProtectedRoute>
              } />
              <Route path="/student-announcements" element={
                <ProtectedRoute userType="student">
                  <StudentLayout><Announcements /></StudentLayout>
                </ProtectedRoute>
              } />

              {/* Landlord routes with bottom nav */}
              <Route path="/landlord-dashboard" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><MyProperties /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/my-properties" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><MyProperties /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/add-property" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><AddProperty /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/edit-property/:id" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><AddProperty /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/viewing-requests" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><ViewingRequests /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/tenants" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><Tenants /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/manage" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><Manage /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/landlord-profile" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><LandlordProfile /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/announcements" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><Announcements /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/complaints" element={
                <ProtectedRoute>
                  <Complaints />
                </ProtectedRoute>
              } />
              <Route path="/rent-tracking" element={
                <ProtectedRoute userType="landlord">
                  <LandlordLayout><RentTracking /></LandlordLayout>
                </ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
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
