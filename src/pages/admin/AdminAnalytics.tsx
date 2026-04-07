import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DailyOrder {
  day: string;
  pedidos: number;
  receita: number;
}

const AdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [dailyData, setDailyData] = useState<DailyOrder[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const [{ data: orders }, { count: photoCount }, { count: eventCount }] = await Promise.all([
        supabase.from("orders").select("id, amount, status, created_at"),
        supabase.from("event_photos").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
      ]);

      setTotalPhotos(photoCount || 0);
      setTotalEvents(eventCount || 0);
      setTotalOrders(orders?.length || 0);

      // Last 7 days orders
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const days: DailyOrder[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toISOString().split("T")[0];
        const dayOrders = orders?.filter(o => o.created_at.startsWith(dayStr)) || [];
        const paidDay = dayOrders.filter(o => o.status === "pago");
        days.push({
          day: dayNames[d.getDay()],
          pedidos: dayOrders.length,
          receita: paidDay.reduce((s, o) => s + Number(o.amount), 0),
        });
      }
      setDailyData(days);
      setLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Relatórios baseados em dados reais</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xl font-bold">{totalEvents}</p>
          <p className="text-xs text-muted-foreground">Eventos Total</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xl font-bold">{totalPhotos.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Fotos Enviadas</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xl font-bold">{totalOrders}</p>
          <p className="text-xs text-muted-foreground">Total de Pedidos</p>
        </div>
      </div>

      {/* Daily chart */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4">Pedidos por Dia (últimos 7 dias)</h3>
        {dailyData.some(d => d.pedidos > 0) ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                <Bar dataKey="pedidos" fill="hsl(18 100% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
            Nenhum pedido nos últimos 7 dias
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
