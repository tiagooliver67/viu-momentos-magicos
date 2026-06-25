import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, HelpCircle } from "lucide-react";
import KpiStrip from "@/components/financeiro/KpiStrip";
import MetaMensalCard from "@/components/financeiro/MetaMensalCard";
import DesempenhoChart from "@/components/financeiro/DesempenhoChart";
import AtalhosRapidos from "@/components/financeiro/AtalhosRapidos";
import EstimativaGanhos from "@/components/financeiro/EstimativaGanhos";
import FaturamentoTable from "@/components/financeiro/FaturamentoTable";
import PedidosTab from "@/components/financeiro/PedidosTab";

type SubTab = "Caixa" | "Pedidos" | "Fiscal";

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState<SubTab>("Caixa");
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's events
  const { data: events = [] } = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("events")
        .select("id, name, event_date, status, plan_type")
        .eq("organizer_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch paid orders for user's events
  const eventIds = events.map((e) => e.id);
  const { data: orders = [] } = useQuery({
    queryKey: ["my-orders-finance", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase
        .from("orders")
        .select("id, amount, created_at, event_id, status")
        .in("event_id", eventIds)
        .in("status", ["pago", "enviado"]);
      return data || [];
    },
    enabled: eventIds.length > 0,
  });

  // Fetch order items for photo/video counts
  const orderIds = orders.map((o) => o.id);
  const { data: orderItems = [] } = useQuery({
    queryKey: ["my-order-items-finance", orderIds],
    queryFn: async () => {
      if (orderIds.length === 0) return [];
      const { data } = await supabase
        .from("order_items")
        .select("order_id, photo_id, video_id, price")
        .in("order_id", orderIds);
      return data || [];
    },
    enabled: orderIds.length > 0,
  });

  // Fetch event photos count for estimativa
  const { data: photosCount = 0 } = useQuery({
    queryKey: ["my-photos-count", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return 0;
      const { count } = await supabase
        .from("event_photos")
        .select("id", { count: "exact", head: true })
        .in("event_id", eventIds);
      return count || 0;
    },
    enabled: eventIds.length > 0,
  });

  // Fetch wallet balance from Asaas
  const { data: walletData } = useQuery({
    queryKey: ["asaas-wallet", user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase.functions.invoke("asaas-wallet", {
          body: { action: "get_balance" },
        });
        return data || null;
      } catch {
        return null;
      }
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // Compute stats
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const ordersThisMonth = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });

  const faturamento = ordersThisMonth.reduce((s, o) => s + Number(o.amount), 0);
  const totalPedidos = ordersThisMonth.length;

  const itemsThisMonth = orderItems.filter((item) =>
    ordersThisMonth.some((o) => o.id === item.order_id)
  );
  const fotosVendidas = itemsThisMonth.filter((i) => i.photo_id).length;
  const videosVendidos = itemsThisMonth.filter((i) => i.video_id).length;

  // Previous month for growth
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  const ordersPrevMonth = orders.filter((o) => {
    const d = new Date(o.created_at);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });
  const fatPrev = ordersPrevMonth.reduce((s, o) => s + Number(o.amount), 0);
  const crescimentoPct = fatPrev > 0 ? ((faturamento - fatPrev) / fatPrev) * 100 : null;

  // Best event
  const eventRevenueMap = useMemo(() => {
    const map: Record<string, number> = {};
    ordersThisMonth.forEach((o) => {
      map[o.event_id] = (map[o.event_id] || 0) + Number(o.amount);
    });
    return map;
  }, [ordersThisMonth]);

  const bestEventId = Object.entries(eventRevenueMap).sort((a, b) => b[1] - a[1])[0]?.[0];
  const melhorEvento = events.find((e) => e.id === bestEventId)?.name || null;

  // Billing table rows
  const billingRows = useMemo(() => {
    const byEvent: Record<string, { date: string; event: string; photos: number; videos: number; revenue: number }> = {};
    ordersThisMonth.forEach((o) => {
      const ev = events.find((e) => e.id === o.event_id);
      if (!ev) return;
      if (!byEvent[o.event_id]) {
        byEvent[o.event_id] = {
          date: new Date(ev.event_date).toLocaleDateString("pt-BR"),
          event: ev.name,
          photos: 0,
          videos: 0,
          revenue: 0,
        };
      }
      byEvent[o.event_id].revenue += Number(o.amount);
      const items = orderItems.filter((i) => i.order_id === o.id);
      byEvent[o.event_id].photos += items.filter((i) => i.photo_id).length;
      byEvent[o.event_id].videos += items.filter((i) => i.video_id).length;
    });
    return Object.values(byEvent).sort((a, b) => b.revenue - a.revenue);
  }, [ordersThisMonth, events, orderItems]);

  const billingTotal = billingRows.reduce((s, r) => s + r.revenue, 0);

  // Estimativa: avg revenue per photo * remaining photos
  const avgRevenuePerPhoto = fotosVendidas > 0 ? faturamento / fotosVendidas : 0;
  const eventosAtivos = events.filter((e) => e.status === "ativo").length;
  const estimativa = avgRevenuePerPhoto * (photosCount - fotosVendidas) * 0.3; // 30% conversion estimate

  const saldoDisponivel = walletData?.balance ?? 0;
  const saldoReceber = walletData?.pending ?? 0;
  const contaConfigurada = !!walletData?.wallet_id || !!walletData?.configured || saldoDisponivel > 0 || saldoReceber > 0;

  // Comissões reais do mês
  const { data: comissoesMes = 0 } = useQuery({
    queryKey: ["my-commissions-month", user?.id, thisMonth, thisYear],
    queryFn: async () => {
      if (!user?.id) return 0;
      const start = new Date(thisYear, thisMonth, 1).toISOString();
      const { data } = await supabase
        .from("referral_earnings")
        .select("amount")
        .eq("referrer_id", user.id)
        .gte("created_at", start);
      return (data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    },
    enabled: !!user?.id,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {/* Sub nav */}
        <div className="mt-14 lg:mt-0 border-b border-border bg-card">
          <div className="flex items-center gap-2 py-2 px-4 sm:px-8 max-w-7xl mx-auto">
            {(["Caixa", "Pedidos", "Fiscal"] as SubTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === "Pedidos" ? "Acompanhe e reenvie pedidos aos seus clientes." :
                 activeTab === "Fiscal" ? "Notas fiscais e relatórios contábeis." :
                 "Acompanhe seu saldo, vendas e saques em um só lugar."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/ajuda")}
                className="px-3 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" /> Dúvidas
              </button>
              <button
                onClick={() => navigate("/dashboard/configuracoes?tab=carteira")}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                Efetuar saque <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {activeTab === "Caixa" && (<>
          {/* Alerta de conta */}
          {!contaConfigurada && (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 p-4 sm:p-5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">Conta de recebimento não configurada</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você precisa cadastrar uma conta bancária para receber seus pagamentos via Pix ou TED.
                </p>
              </div>
              <button
                onClick={() => navigate("/dashboard/configuracoes?tab=carteira")}
                className="px-3 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors flex-shrink-0"
              >
                Configurar
              </button>
            </div>
          )}

          {/* KPI Strip (4 cards) */}
          <KpiStrip
            saldoDisponivel={saldoDisponivel}
            vendasMes={faturamento}
            vendasCrescimentoPct={crescimentoPct}
            comissoesMes={Number(comissoesMes) || 0}
            aReceber={saldoReceber}
          />

          {/* Desempenho + Meta */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <DesempenhoChart orders={orders} />
            </div>
            <MetaMensalCard faturamento={faturamento} />
          </div>

          {/* Estimativa de ganhos */}
          <EstimativaGanhos
            estimativa={estimativa > 0 ? estimativa : 0}
            eventosAtivos={eventosAtivos}
            fotosNoMes={photosCount}
          />

          {/* Atalhos rápidos */}
          <AtalhosRapidos />

          {/* Faturamento por evento */}
          <FaturamentoTable rows={billingRows} total={billingTotal} />
          </>)}

          {activeTab === "Pedidos" && <PedidosTab />}

          {activeTab === "Fiscal" && (
            <div className="glass-card p-10 text-center text-muted-foreground">
              <p className="text-sm">Relatórios fiscais e exportação de notas em breve.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Financeiro;
