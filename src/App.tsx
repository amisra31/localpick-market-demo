
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ShopOwnerLogin from "./pages/ShopOwnerLogin";
import ShopOwnerDashboard from "./pages/ShopOwnerDashboard";
import CustomerBrowse from "./pages/CustomerBrowse";
import CustomerReservations from "./pages/CustomerReservations";
import AdminDashboard from "./pages/AdminDashboard";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/shop-owner-login" element={<ShopOwnerLogin />} />
          <Route path="/shop-owner-dashboard" element={<ShopOwnerDashboard />} />
          <Route path="/browse" element={<CustomerBrowse />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/my-reservations" element={<CustomerReservations />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
