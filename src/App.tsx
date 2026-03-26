import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Index from "./pages/Index";
import EventPage from "./pages/EventPage";
import Dashboard from "./pages/Dashboard";
import Financeiro from "./pages/Financeiro";
import CriarEvento from "./pages/CriarEvento";
import VIUPass from "./pages/VIUPass";
import Pedidos from "./pages/Pedidos";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLogs from "./pages/admin/AdminLogs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/evento/:id" element={<EventPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/financeiro" element={<Financeiro />} />
            <Route path="/dashboard/criar-evento" element={<CriarEvento />} />
            <Route path="/dashboard/pedidos" element={<Pedidos />} />
            <Route path="/viu-pass" element={<VIUPass />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="usuarios" element={<AdminUsers />} />
              <Route path="eventos" element={<AdminEvents />} />
              <Route path="financeiro" element={<AdminFinance />} />
              <Route path="moderacao" element={<AdminModeration />} />
              <Route path="suporte" element={<AdminSupport />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="configuracoes" element={<AdminSettings />} />
              <Route path="logs" element={<AdminLogs />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
