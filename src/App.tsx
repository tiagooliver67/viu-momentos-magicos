import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import EventPage from "./pages/EventPage";
import Dashboard from "./pages/Dashboard";
import Financeiro from "./pages/Financeiro";
import CriarEvento from "./pages/CriarEvento";
import VIUPass from "./pages/VIUPass";
import Pedidos from "./pages/Pedidos";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
