import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import EventPage from "./pages/EventPage";
import Dashboard from "./pages/Dashboard";
// Financeiro page removed — unified into Carteira tab in Configuracoes
import CriarEvento from "./pages/CriarEvento";
import VIUPass from "./pages/VIUPass";
import Pedidos from "./pages/Pedidos";
import Clientes from "./pages/Clientes";
import Configuracoes from "./pages/Configuracoes";
import Oportunidades from "./pages/Oportunidades";
import Propostas from "./pages/Propostas";
import EventDashboard from "./pages/EventDashboard";
import Login from "./pages/Login";
import LoginRole from "./pages/LoginRole";
import Cadastro from "./pages/Cadastro";
import CadastroFotografo from "./pages/CadastroFotografo";
import CadastroOrganizador from "./pages/CadastroOrganizador";
import RecuperarSenha from "./pages/RecuperarSenha";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import FotoPage from "./pages/FotoPage";
import PhotographerPage from "./pages/PhotographerPage";
import MeusPedidos from "./pages/MeusPedidos";
import BuscarEventos from "./pages/BuscarEventos";
import Favoritos from "./pages/Favoritos";
import VirarFotografo from "./pages/VirarFotografo";
import ParaOrganizadores from "./pages/ParaOrganizadores";
import TermosDeUso from "./pages/TermosDeUso";
import TermsGate from "./components/TermsGate";
import AdminLayout from "./components/admin/AdminLayout";
import Overview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminPhotographers from "./pages/admin/AdminPhotographers";
import AdminFinance from "./pages/admin/AdminFinance";
import AdminModeration from "./pages/admin/AdminModeration";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminStorage from "./pages/admin/AdminStorage";
import AdminInscricoes from "./pages/admin/AdminInscricoes";
import AdminInscricaoDetail from "./pages/admin/AdminInscricaoDetail";
import AdminHero from "./pages/admin/AdminHero";
import AdminPhotos from "./pages/admin/AdminPhotos";
import InscricoesList from "./pages/inscricoes/InscricoesList";
import InscricaoForm from "./pages/inscricoes/InscricaoForm";
import InscricaoDetail from "./pages/inscricoes/InscricaoDetail";
import InscricaoPublic from "./pages/inscricoes/InscricaoPublic";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Sonner />
            <TermsGate />
            <PageTransition>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/:role" element={<LoginRole />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/cadastro/fotografo" element={<CadastroFotografo />} />
              <Route path="/cadastro/organizador" element={<CadastroOrganizador />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/evento/:id" element={<EventPage />} />
              <Route path="/foto/:photoId" element={<FotoPage />} />
              <Route path="/fotografo/:slug" element={<PhotographerPage />} />
              <Route path="/meus-pedidos" element={<MeusPedidos />} />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path="/buscar" element={<BuscarEventos />} />
              <Route path="/viu-pass" element={<VIUPass />} />
              <Route path="/virar-fotografo" element={<VirarFotografo />} />
              <Route path="/para-organizadores" element={<ParaOrganizadores />} />
              <Route path="/termos-de-uso" element={<TermosDeUso />} />
              <Route path="/inscricao/:slug" element={<InscricaoPublic />} />
              <Route path="/dashboard" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><Dashboard /></ProtectedRoute>} />
              {/* Financeiro route removed — unified into Carteira */}
              <Route path="/dashboard/criar-evento" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><CriarEvento /></ProtectedRoute>} />
              <Route path="/dashboard/pedidos" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><Pedidos /></ProtectedRoute>} />
              <Route path="/dashboard/clientes" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><Clientes /></ProtectedRoute>} />
              <Route path="/dashboard/oportunidades" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><Oportunidades /></ProtectedRoute>} />
              <Route path="/dashboard/propostas" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><Propostas /></ProtectedRoute>} />
              <Route path="/dashboard/configuracoes" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><Configuracoes /></ProtectedRoute>} />
              <Route path="/dashboard/evento/:id" element={<ProtectedRoute requiredRoles={["photographer", "organizer"]}><EventDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/inscricoes" element={<ProtectedRoute requiredRoles={["organizer"]}><InscricoesList /></ProtectedRoute>} />
              <Route path="/dashboard/inscricoes/novo" element={<ProtectedRoute requiredRoles={["organizer"]}><InscricaoForm /></ProtectedRoute>} />
              <Route path="/dashboard/inscricoes/:id" element={<ProtectedRoute requiredRoles={["organizer"]}><InscricaoDetail /></ProtectedRoute>} />
              <Route path="/dashboard/inscricoes/:id/editar" element={<ProtectedRoute requiredRoles={["organizer"]}><InscricaoForm /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute requiredRoles={["super_admin"]} redirectTo="/"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Overview />} />
                <Route path="usuarios" element={<AdminUsers />} />
                <Route path="fotografos" element={<AdminPhotographers />} />
                <Route path="eventos" element={<AdminEvents />} />
                <Route path="financeiro" element={<AdminFinance />} />
                <Route path="pagamentos" element={<AdminPayments />} />
                <Route path="moderacao" element={<AdminModeration />} />
                <Route path="storage" element={<AdminStorage />} />
                <Route path="inscricoes" element={<AdminInscricoes />} />
                <Route path="inscricoes/:id" element={<AdminInscricaoDetail />} />
                <Route path="suporte" element={<AdminSupport />} />
                <Route path="analytics" element={<AdminAnalytics />} />
                <Route path="configuracoes" element={<AdminSettings />} />
                <Route path="hero" element={<AdminHero />} />
                <Route path="fotos" element={<AdminPhotos />} />
                <Route path="logs" element={<AdminLogs />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </PageTransition>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
