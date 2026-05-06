import { useState, useMemo } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { Search, Filter, Calendar, ChevronDown, Eye, X } from "lucide-react";

const allOrders = [
  { id: "0022379712", customer: "Patricio Silva Souza", email: "patricio@email.com", cpf: "123.456.789-00", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 30,00", valueNum: 30, origin: "Instagram", event: "VERÃO RUN IRECÊ 22.03.2026", photos: 3 },
  { id: "0022379329", customer: "Patricio Silva Souza", email: "patricio@email.com", cpf: "123.456.789-00", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 30,00", valueNum: 30, origin: "Instagram", event: "VERÃO RUN IRECÊ 22.03.2026", photos: 2 },
  { id: "0022378456", customer: "Gustavo Reis Silva", email: "gustavo@email.com", cpf: "987.654.321-00", date: "24/03/2026", status: "Aguardando Pagamento", payment: "Pix", value: "R$ 15,00", valueNum: 15, origin: "Instagram", event: "Copa Caraíbas De Futsal", photos: 1 },
  { id: "0022377806", customer: "Kayke Alves Dos Santos", email: "kayke@email.com", cpf: "456.789.123-00", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 15,00", valueNum: 15, origin: "Tráfego direto", event: "VERÃO RUN IRECÊ 22.03.2026", photos: 1 },
  { id: "0022377377", customer: "Erica Santos", email: "erica@email.com", cpf: "321.654.987-00", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 15,00", valueNum: 15, origin: "Instagram", event: "Copa Caraíbas De Futsal", photos: 1 },
  { id: "0022376001", customer: "Marcos Oliveira", email: "marcos@email.com", cpf: "111.222.333-44", date: "23/03/2026", status: "Pago", payment: "Cartão", value: "R$ 45,00", valueNum: 45, origin: "Google", event: "VERÃO RUN IRECÊ 22.03.2026", photos: 4 },
  { id: "0022375890", customer: "Ana Paula Costa", email: "ana@email.com", cpf: "555.666.777-88", date: "23/03/2026", status: "Aguardando Pagamento", payment: "Pix", value: "R$ 20,00", valueNum: 20, origin: "WhatsApp", event: "Copa Caraíbas De Futsal", photos: 2 },
  { id: "0022375500", customer: "Roberto Almeida", email: "roberto@email.com", cpf: "999.888.777-66", date: "22/03/2026", status: "Pedido Enviado", payment: "Cartão", value: "R$ 60,00", valueNum: 60, origin: "Instagram", event: "VERÃO RUN IRECÊ 22.03.2026", photos: 5 },
  { id: "0022374200", customer: "Fernanda Lima", email: "fernanda@email.com", cpf: "444.333.222-11", date: "22/03/2026", status: "Pago", payment: "Pix", value: "R$ 25,00", valueNum: 25, origin: "Tráfego direto", event: "Treino Orla Pituaçu", photos: 2 },
  { id: "0022373100", customer: "Lucas Mendes", email: "lucas@email.com", cpf: "777.888.999-00", date: "21/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 30,00", valueNum: 30, origin: "Instagram", event: "VERÃO RUN IRECÊ 22.03.2026", photos: 3 },
];

const statusOptions = ["Todos", "Pedido Enviado", "Pago", "Aguardando Pagamento"];
const paymentOptions = ["Todos", "Pix", "Cartão"];

const Pedidos = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [paymentFilter, setPaymentFilter] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof allOrders[0] | null>(null);

  const filtered = useMemo(() => {
    return allOrders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || 
        order.customer.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.cpf.includes(q) ||
        order.id.includes(q);
      const matchesStatus = statusFilter === "Todos" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "Todos" || order.payment === paymentFilter;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [searchQuery, statusFilter, paymentFilter]);

  const totalValue = filtered.reduce((sum, o) => sum + o.valueNum, 0);

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Pedidos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {filtered.length} pedido{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""} 
          {" "}• Total: R$ {totalValue.toFixed(2).replace(".", ",")}
        </p>

        {/* Search + Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, CPF ou ID do pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors text-sm min-h-[44px]"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium min-h-[44px] transition-colors ${
              showFilters ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {(statusFilter !== "Todos" || paymentFilter !== "Todos") && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="glass-card p-4 mb-4 flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]"
              >
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Pagamento</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm min-h-[40px]"
              >
                {paymentOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setStatusFilter("Todos"); setPaymentFilter("Todos"); }}
              className="self-end px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedOrder(null)}>
            <div className="glass-card p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Pedido #{selectedOrder.id}</h3>
                <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="text-foreground font-medium">{selectedOrder.customer}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span className="text-foreground">{selectedOrder.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPF</span><span className="text-foreground">{selectedOrder.cpf}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Data</span><span className="text-foreground">{selectedOrder.date}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Evento</span><span className="text-foreground">{selectedOrder.event}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fotos</span><span className="text-foreground">{selectedOrder.photos}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span className="text-foreground">{selectedOrder.payment}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Origem</span><span className="text-foreground">{selectedOrder.origin}</span></div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedOrder.status === "Pedido Enviado" ? "bg-lime/10 text-lime" : 
                    selectedOrder.status === "Pago" ? "bg-accent/10 text-accent" :
                    "bg-primary/10 text-primary"
                  }`}>{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground font-medium">Valor total</span>
                  <span className="text-foreground font-bold text-lg">{selectedOrder.value}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="glass-card overflow-hidden">
          {/* Mobile: Card view */}
          <div className="sm:hidden divide-y divide-border/50">
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado</div>
            )}
            {filtered.map((order) => (
              <div key={order.id} className="p-4 space-y-2" onClick={() => setSelectedOrder(order)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.customer}</p>
                    <p className="text-xs font-mono text-primary">#{order.id}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                    order.status === "Pedido Enviado" ? "bg-lime/10 text-lime" : 
                    order.status === "Pago" ? "bg-accent/10 text-accent" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{order.date} • {order.payment}</span>
                  <span className="font-bold text-foreground text-sm">{order.value}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Table view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["PEDIDO", "CLIENTE", "DATA", "STATUS", "PAGAMENTO", "VALOR", "ORIGEM", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum pedido encontrado</td></tr>
                )}
                {filtered.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-primary">{order.id}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-foreground">{order.customer}</p>
                        <p className="text-xs text-muted-foreground">{order.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "Pedido Enviado" ? "bg-lime/10 text-lime" : 
                        order.status === "Pago" ? "bg-accent/10 text-accent" :
                        "bg-primary/10 text-primary"
                      }`}>{order.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.payment}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{order.value}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.origin}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedOrder(order)} className="p-2 rounded-lg hover:bg-secondary transition-colors" title="Ver detalhes">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pedidos;
