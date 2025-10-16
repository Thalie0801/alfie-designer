import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AffiliateTracker } from "@/components/AffiliateTracker";
import { AppLayoutWithSidebar } from "./components/AppLayoutWithSidebar";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Creator = lazy(() => import("./pages/Creator"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Billing = lazy(() => import("./pages/Billing"));
const Contact = lazy(() => import("./pages/Contact"));
const CreditPurchaseSuccess = lazy(() => import("./pages/CreditPurchaseSuccess"));
const Admin = lazy(() => import("./pages/Admin"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const Profile = lazy(() => import("./pages/Profile"));
const DevenirPartenaire = lazy(() => import("./pages/DevenirPartenaire"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Legal = lazy(() => import("./pages/Legal"));
const FAQ = lazy(() => import("./pages/FAQ"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Templates = lazy(() => import("./pages/Templates"));
const Library = lazy(() => import("./pages/Library"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AffiliateTracker />
      <AuthProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Chargement…</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/devenir-partenaire" element={<DevenirPartenaire />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/faq" element={<FAQ />} />
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
              path="/library"
              element={
                <ProtectedRoute requirePlan>
                  <AppLayoutWithSidebar>
                    <Library />
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
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
