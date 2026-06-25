import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, X, Eye, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OrderDetailModal from "./OrderDetailModal";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "aguardando_pagamento", label: "Aguardando pagamento" },
  { value: "pago", label: "Pago" },
  { value: "enviado", label: "Enviado" },
  { value: "cancelado", label: "Cancelado" },
];
const PAYMENT_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
];
const PAGE_SIZE = 20;

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function PedidosTab() {
  const { user } = useAuth();
  const range = useMemo(defaultRange, []);

  const [dateStart, setDateStart] = useState(range.start);
  const [dateEnd, setDateEnd] = useState(range.end);
  const [search, setSearch] = useState("");
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["my-events-pedidos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("events")
        .select("id, name")
        .eq("organizer_id", user!.id)
        .order("event_date", { ascending: false });
      return data || [];
    },
  });

  const eventIds = events.map((e) => e.id);
  const eventMap = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e.name])), [events]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["pedidos", eventIds, dateStart, dateEnd, statusFilter, paymentFilter, eventFilter],
    enabled: eventIds.length > 0,
    queryFn: async () => {
      const targetEventIds = eventFilter === "all" ? eventIds : [eventFilter];
      let q = supabase
        .from("orders")
        .select("id, client_name, client_email, client_cpf, amount, status, payment_method, created_at, event_id, tracking_origin")
        .in("event_id", targetEventIds)
        .gte("created_at", `${dateStart}T00:00:00`)
        .lte("created_at", `${dateEnd}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as any);
      if (paymentFilter !== "all") q = q.eq("payment_method", paymentFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const orderIds = orders.map((o) => o.id);
  const { data: itemCounts = {} } = useQuery({
    queryKey: ["pedidos-items", orderIds],
    enabled: orderIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("order_items")
        .select("order_id")
        .in("order_id", orderIds);
      const counts: Record<string, number> = {};
      (data || []).forEach((i) => { counts[i.order_id] = (counts[i.order_id] || 0) + 1; });
      return counts;
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const idq = orderIdSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (q) {
        const match = o.client_name?.toLowerCase().includes(q) ||
          o.client_email?.toLowerCase().includes(q) ||
          (o.client_cpf || "").includes(q);
        if (!match) return false;
      }
      if (idq && !o.id.toLowerCase().includes(idq)) return false;
      return true;
    });
  }, [orders, search, orderIdSearch]);

  const totalValue = filtered.reduce((s, o) => s + Number(o.amount), 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => {
    setSearch(""); setOrderIdSearch(""); setPaymentFilter("all"); setStatusFilter("all"); setEventFilter("all");
    setDateStart(range.start); setDateEnd(range.end);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      enviado: "bg-lime/10 text-lime",
      pago: "bg-accent/10 text-accent",
      cancelado: "bg-destructive/10 text-destructive",
      aguardando_pagamento: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    };
    const labels: Record<string, string> = {
      enviado: "Pedido enviado",
      pago: "Pago",
      cancelado: "Cancelado",
      aguardando_pagamento: "Aguardando pagto",
    };
    return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Filters card */}
      <div className="glass-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-primary uppercase tracking-wide">Pedidos</h2>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs"
          >
            <Filter className="w-3.5 h-3.5" /> Filtros
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3`}>
          <div className="flex gap-2 items-center">
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]" />
            <span className="text-muted-foreground text-xs">—</span>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]" />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              placeholder="Nome, e-mail ou CPF"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]"
            />
          </div>

          <input
            placeholder="ID do pedido"
            value={orderIdSearch}
            onChange={(e) => { setOrderIdSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]"
          />

          <select value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]">
            {PAYMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>Pagamento: {o.label}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px] lg:col-span-2">
            <option value="all">Todos os meus eventos</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <button
            onClick={clearFilters}
            className="px-3 py-2 rounded-lg border border-border text-foreground text-sm min-h-[40px] inline-flex items-center justify-center gap-1.5 hover:bg-secondary"
          >
            <X className="w-3.5 h-3.5" /> Limpar
          </button>
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Carregando..." : (
            <>
              <span className="font-semibold text-foreground">{filtered.length}</span> pedido(s) encontrado(s) ·{" "}
              <span className="font-semibold text-foreground">R$ {totalValue.toFixed(2).replace(".", ",")}</span>
            </>
          )}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-muted-foreground">página {page} de {totalPages}</p>
        )}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {/* Mobile */}
        <div className="sm:hidden divide-y divide-border/50">
          {pageRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado</div>
          ) : pageRows.map((o) => (
            <button key={o.id} onClick={() => setSelectedOrder({ ...o, event_name: eventMap[o.event_id], items_count: itemCounts[o.id] })} className="w-full text-left p-4 space-y-2 hover:bg-secondary/30">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{o.client_name}</p>
                  <p className="text-[11px] font-mono text-primary">#{o.id.slice(0, 8).toUpperCase()}</p>
                </div>
                {statusBadge(o.status)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.payment_method || "-"}</span>
                <span className="font-bold text-foreground text-sm">R$ {Number(o.amount).toFixed(2).replace(".", ",")}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["PEDIDO", "CLIENTE", "DATA", "STATUS", "PAGTO", "VALOR", "EVENTO", ""].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum pedido encontrado no período</td></tr>
              ) : pageRows.map((o) => (
                <tr key={o.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-primary">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-foreground">{o.client_name}</p>
                    <p className="text-xs text-muted-foreground">{o.client_email}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{new Date(o.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3">{statusBadge(o.status)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{o.payment_method || "-"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-foreground whitespace-nowrap">R$ {Number(o.amount).toFixed(2).replace(".", ",")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{eventMap[o.event_id] || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedOrder({ ...o, event_name: eventMap[o.event_id], items_count: itemCounts[o.id] })}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {(o.status === "pago" || o.status === "enviado") && (
                        <button
                          onClick={() => setSelectedOrder({ ...o, event_name: eventMap[o.event_id], items_count: itemCounts[o.id] })}
                          className="p-2 rounded-lg hover:bg-primary/10 transition-colors"
                          title="Reenviar ao cliente"
                        >
                          <Download className="w-4 h-4 text-primary" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 py-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-secondary">Anterior</button>
          {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
            const p = i + 1;
            return (
              <button key={p} onClick={() => setPage(p)} className={`min-w-[36px] h-9 rounded-lg text-sm font-medium ${page === p ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}>{p}</button>
            );
          })}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:bg-secondary">Próxima</button>
        </div>
      )}

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}