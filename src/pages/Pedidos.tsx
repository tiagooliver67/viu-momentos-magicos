import DashboardSidebar from "@/components/DashboardSidebar";
import { Link } from "react-router-dom";

const orders = [
  { id: "0022379712", customer: "Patricio Silva Souza", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 30,00", origin: "Instagram" },
  { id: "0022379329", customer: "Patricio Silva Souza", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 30,00", origin: "Instagram" },
  { id: "0022378456", customer: "Gustavo Reis Silva", date: "24/03/2026", status: "Aguardando Pagamento", payment: "Pix", value: "R$ 15,00", origin: "Instagram" },
  { id: "0022377806", customer: "Kayke Alves Dos Santos", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 15,00", origin: "Tráfego direto" },
  { id: "0022377377", customer: "Erica", date: "24/03/2026", status: "Pedido Enviado", payment: "Pix", value: "R$ 15,00", origin: "Instagram" },
];

const Pedidos = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-18 lg:pt-6 lg:p-8 overflow-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Pedidos</h1>
        <p className="text-sm text-muted-foreground mb-6 sm:mb-8">Encontrado 190 pedidos</p>

        <div className="glass-card overflow-hidden">
          {/* Mobile: Card view */}
          <div className="sm:hidden divide-y divide-border/50">
            {orders.map((order) => (
              <div key={order.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{order.customer}</p>
                    <p className="text-xs font-mono text-primary">#{order.id}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${
                    order.status === "Pedido Enviado" ? "bg-lime/10 text-lime" : "bg-primary/10 text-primary"
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
                  {["PEDIDO", "CLIENTE", "DATA", "STATUS", "PAGAMENTO", "VALOR", "ORIGEM"].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-primary">{order.id}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{order.customer}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.date}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "Pedido Enviado" ? "bg-lime/10 text-lime" : "bg-primary/10 text-primary"
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{order.payment}</td>
                    <td className="px-4 py-3 text-sm font-bold text-foreground">{order.value}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{order.origin}</td>
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
