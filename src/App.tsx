import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Encrypt from "./pages/Encrypt";
import Decrypt from "./pages/Decrypt";
import Confides from "./pages/Confides";
import SendRequest from "./pages/SendRequest";
import PendingRequests from "./pages/PendingRequests";
import IncomingRequests from "./pages/IncomingRequests";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = window.location;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!user) {
    // Store the intended URL for redirect after login
    const intendedUrl = location.pathname + location.search;
    sessionStorage.setItem('redirectAfterLogin', intendedUrl);
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/encrypt"
              element={
                <ProtectedRoute>
                  <Encrypt />
                </ProtectedRoute>
              }
            />
            <Route
              path="/decrypt"
              element={
                <ProtectedRoute>
                  <Decrypt />
                </ProtectedRoute>
              }
            />
            <Route
              path="/confides"
              element={
                <ProtectedRoute>
                  <Confides />
                </ProtectedRoute>
              }
            />
            <Route
              path="/send-request"
              element={
                <ProtectedRoute>
                  <SendRequest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pending-requests"
              element={
                <ProtectedRoute>
                  <PendingRequests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incoming-requests"
              element={
                <ProtectedRoute>
                  <IncomingRequests />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
