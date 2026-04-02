import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import EventPage from "./pages/EventPage";
import Dashboard from "./pages/Dashboard";
import Financeiro from "./pages/Financeiro";
import CriarEvento from "./pages/CriarEvento";
import VIUPass from "./pages/VIUPass";
import Pedidos from "./pages/Pedidos";
import Configuracoes from "./pages/Configuracoes";
import EventDashboard from "./pages/EventDashboard";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RecuperarSenha from "./pages/RecuperarSenha";
import ResetPassword from "./pages/ResetPassword";
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
        <BrowserRouter>
          <AuthProvider>
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/evento/:id" element={<EventPage />} />
              <Route path="/viu-pass" element={<VIUPass />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
              <Route path="/dashboard/criar-evento" element={<ProtectedRoute><CriarEvento /></ProtectedRoute>} />
              <Route path="/dashboard/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
              <Route path="/dashboard/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
              <Route path="/dashboard/evento/:id" element={<ProtectedRoute><EventDashboard /></ProtectedRoute>} />
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
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
