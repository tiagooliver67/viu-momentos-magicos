import { Info } from "lucide-react";

const AdminSupport = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Suporte</h1>
        <p className="text-sm text-muted-foreground">Tickets e atendimento</p>
      </div>

      <div className="glass-card p-8 text-center">
        <Info className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Nenhum ticket aberto</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Quando tickets de suporte forem criados pelos usuários, eles aparecerão aqui. Nenhum dado fictício é exibido.
        </p>
      </div>
    </div>
  );
};

export default AdminSupport;
