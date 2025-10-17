import { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AffiliateTracker } from '@/components/AffiliateTracker';
import { AppLayoutWithSidebar } from '@/components/AppLayoutWithSidebar';
import App from './App';
import Generator from './pages/Generator';
import Index from './pages/Index';
import Auth from './pages/Auth';
import Creator from './pages/Creator';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Contact from './pages/Contact';
import CreditPurchaseSuccess from './pages/CreditPurchaseSuccess';
import Admin from './pages/Admin';
import Affiliate from './pages/Affiliate';
import Profile from './pages/Profile';
import DevenirPartenaire from './pages/DevenirPartenaire';
import Privacy from './pages/Privacy';
import Legal from './pages/Legal';
import FAQ from './pages/FAQ';
import NotFound from './pages/NotFound';
import Templates from './pages/Templates';
import Library from './pages/Library';
import Demo from './pages/Demo';

import './styles/index.css';

type ErrorBoundaryState = { error?: Error };

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Runtime error:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <pre style={{ padding: 16, color: 'crimson', whiteSpace: 'pre-wrap' }}>
          {String(this.state.error.message ?? this.state.error)}
        </pre>
      );
    }

    return this.props.children;
  }
}

const queryClient = new QueryClient();

function RootShell() {
  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AffiliateTracker />
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </TooltipProvider>
  );
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootShell />,
      children: [
        { index: true, element: <App /> },
        { path: 'landing', element: <Index /> },
        { path: 'demo', element: <Demo /> },
        { path: 'generator', element: <Generator /> },
        { path: 'auth', element: <Auth /> },
        { path: 'contact', element: <Contact /> },
        { path: 'devenir-partenaire', element: <DevenirPartenaire /> },
        { path: 'privacy', element: <Privacy /> },
        { path: 'legal', element: <Legal /> },
        { path: 'faq', element: <FAQ /> },
        {
          path: 'app',
          element: (
            <ProtectedRoute requirePlan>
              <AppLayoutWithSidebar>
                <Creator />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'templates',
          element: (
            <ProtectedRoute requirePlan>
              <AppLayoutWithSidebar>
                <Templates />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'library',
          element: (
            <ProtectedRoute requirePlan>
              <AppLayoutWithSidebar>
                <Library />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'dashboard',
          element: (
            <ProtectedRoute requirePlan>
              <AppLayoutWithSidebar>
                <Dashboard />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'affiliate',
          element: (
            <ProtectedRoute requirePlan>
              <AppLayoutWithSidebar>
                <Affiliate />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'profile',
          element: (
            <ProtectedRoute requirePlan>
              <AppLayoutWithSidebar>
                <Profile />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'billing',
          element: (
            <ProtectedRoute>
              <AppLayoutWithSidebar>
                <Billing />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'credit-purchase-success',
          element: (
            <ProtectedRoute>
              <AppLayoutWithSidebar>
                <CreditPurchaseSuccess />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        {
          path: 'admin',
          element: (
            <ProtectedRoute requireAdmin>
              <AppLayoutWithSidebar>
                <Admin />
              </AppLayoutWithSidebar>
            </ProtectedRoute>
          ),
        },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
