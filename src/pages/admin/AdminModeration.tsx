import { Info } from "lucide-react";

const AdminModeration = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Moderação</h1>
        <p className="text-sm text-muted-foreground">Revisão de conteúdo e denúncias</p>
      </div>

      <div className="glass-card p-8 text-center">
        <Info className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-semibold mb-1">Nenhuma denúncia registrada</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Quando denúncias ou conteúdos sinalizados forem recebidos, eles aparecerão aqui para revisão. Nenhum dado fictício é exibido.
        </p>
      </div>
    </div>
  );
};

export default AdminModeration;
