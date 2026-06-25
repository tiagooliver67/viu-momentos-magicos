import DashboardSidebar from "@/components/DashboardSidebar";
import PedidosTab from "@/components/financeiro/PedidosTab";

const Pedidos = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <main className="flex-1 p-4 pt-20 lg:pt-6 lg:p-8 overflow-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Pedidos</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Gerencie e reenvie pedidos aos seus clientes.
        </p>
        <PedidosTab />
      </main>
    </div>
  );
};

export default Pedidos;
