
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import ManageShop from "./pages/ManageShop";
import ShopOwnerLogin from "./pages/ShopOwnerLogin";
import ShopOwnerDashboard from "./pages/ShopOwnerDashboard";
import CustomerBrowse from "./pages/CustomerBrowse";
import CustomerReservations from "./pages/CustomerReservations";
import AdminDashboard from "./pages/AdminDashboard";
import AdminPortal from "./pages/AdminPortal";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/browse" element={<CustomerBrowse />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            
            {/* Protected User Routes */}
            <Route path="/my-reservations" element={
              <ProtectedRoute requiredRole="user">
                <CustomerReservations />
              </ProtectedRoute>
            } />
            
            {/* Protected Merchant Routes */}
            <Route path="/manage-shop" element={
              <ProtectedRoute requiredRole="merchant">
                <ManageShop />
              </ProtectedRoute>
            } />
            <Route path="/shop-owner-login" element={<ShopOwnerLogin />} />
            <Route path="/shop-owner-dashboard" element={
              <ProtectedRoute requiredRole="merchant">
                <ShopOwnerDashboard />
              </ProtectedRoute>
            } />
            
            {/* Protected Admin Routes */}
            <Route path="/admin-dashboard" element={
              <ProtectedRoute requiredRole="admin">
                <AdminPortal />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
