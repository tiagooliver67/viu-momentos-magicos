import { Info } from "lucide-react";

const AdminLogs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Testes & Logs</h1>
        <p className="text-sm text-muted-foreground">Auditoria e debug da plataforma</p>
      </div>

      <div className="glass-card p-8 text-center">
        <Info className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Sem logs registrados</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          O sistema de logs será populado automaticamente conforme as ações forem realizadas na plataforma. Nenhum dado fictício é exibido aqui.
        </p>
      </div>
    </div>
  );
};

export default AdminLogs;
