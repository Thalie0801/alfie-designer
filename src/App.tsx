import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Creator from "./pages/Creator";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import CreditPurchaseSuccess from "./pages/CreditPurchaseSuccess";
import Admin from "./pages/Admin";
import Affiliate from "./pages/Affiliate";
import Profile from "./pages/Profile";
import DevenirPartenaire from "./pages/DevenirPartenaire";
import NotFound from "./pages/NotFound";
import Templates from "./pages/Templates";
import { AppLayoutWithSidebar } from "./components/AppLayoutWithSidebar";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AffiliateTracker />
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/devenir-partenaire" element={<DevenirPartenaire />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute requirePlan>
                  <AppLayoutWithSidebar>
                    <Creator />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute requirePlan>
                  <AppLayoutWithSidebar>
                    <Templates />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requirePlan>
                  <AppLayoutWithSidebar>
                    <Dashboard />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/affiliate"
              element={
                <ProtectedRoute requirePlan>
                  <AppLayoutWithSidebar>
                    <Affiliate />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute requirePlan>
                  <AppLayoutWithSidebar>
                    <Profile />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <AppLayoutWithSidebar>
                    <Billing />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/credit-purchase-success"
              element={
                <ProtectedRoute>
                  <AppLayoutWithSidebar>
                    <CreditPurchaseSuccess />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AppLayoutWithSidebar>
                    <Admin />
                  </AppLayoutWithSidebar>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
