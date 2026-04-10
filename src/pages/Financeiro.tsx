import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardSidebar from "@/components/DashboardSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SaldoCard from "@/components/financeiro/SaldoCard";
import DesempenhoCard from "@/components/financeiro/DesempenhoCard";
import AtalhosRapidos from "@/components/financeiro/AtalhosRapidos";
import EstimativaGanhos from "@/components/financeiro/EstimativaGanhos";
import FaturamentoTable from "@/components/financeiro/FaturamentoTable";

type SubTab = "Caixa" | "Pedidos" | "Fiscal";

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState<SubTab>("Caixa");
  const { user } = useAuth();

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

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {/* Sub nav */}
        <div className="bg-primary mt-14 lg:mt-0">
          <div className="flex items-center justify-center gap-2 sm:gap-6 py-3 px-4">
            {(["Caixa", "Pedidos", "Fiscal"] as SubTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all min-h-[44px] ${
                  activeTab === tab
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
            <button className="px-4 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
              Dúvidas? <span className="font-bold text-foreground">Clique aqui</span>
            </button>
          </div>

          {/* Top cards: Saldo + Desempenho */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <SaldoCard saldoReceber={saldoReceber} saldoDisponivel={saldoDisponivel} />
            <DesempenhoCard
              totalPedidos={totalPedidos}
              fotosVendidas={fotosVendidas}
              videosVendidos={videosVendidos}
              faturamento={faturamento}
              crescimentoPct={crescimentoPct}
              melhorEvento={melhorEvento}
            />
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
        </div>
      </main>
    </div>
  );
};

export default Financeiro;
